import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "./prisma";
import { ReplySenderType, TicketStatus } from "@helpdesk/core";
import type { ticket } from "../generated/prisma/client";

const knowledgeBasePath = new URL("../../knowledge-base.md", import.meta.url);
let knowledgeBasePromise: Promise<string> | null = null;

function getKnowledgeBase(): Promise<string> {
  if (!knowledgeBasePromise) {
    knowledgeBasePromise = Bun.file(knowledgeBasePath).text().catch((err) => {
      // Don't cache a rejected promise — retry the read on the next ticket instead of
      // permanently disabling auto-resolve for the life of the process.
      knowledgeBasePromise = null;
      throw err;
    });
  }
  return knowledgeBasePromise;
}

// A flat object, not a discriminated union — Groq's structured-outputs mode requires the
// top-level schema to be a plain object and rejects a oneOf/anyOf at the top level.
const resolutionSchema = z.object({
  resolved: z.boolean(),
  reply: z.string().nullable(),
});

// Only transitions a ticket out of "processing" — if an agent already moved it elsewhere (e.g.
// manually closed it while the job was in flight) this is a no-op, so their action wins.
async function markOpen(ticketId: string): Promise<void> {
  const release = () =>
    prisma.ticket.updateMany({
      where: { id: ticketId, status: TicketStatus.processing },
      data: { status: TicketStatus.open },
    });

  // Retry once — a ticket must never be left stuck in "processing" (hidden from the ticket
  // list) just because a transient DB error hit the very query meant to release it.
  try {
    await release();
  } catch (err) {
    console.error(`[auto-resolve-ticket] Retrying status reset for ticket ${ticketId}:`, err);
    await release();
  }
}

function getFirstName(senderName: string): string {
  return senderName.trim().split(/\s+/)[0] ?? senderName;
}

export async function autoResolveTicket(
  ticket: Pick<ticket, "id" | "subject" | "body" | "senderName">,
): Promise<void> {
  try {
    // Only claim tickets still in their initial "new" state — if an agent already acted on this
    // ticket (or another run already claimed it), back off instead of overwriting them.
    const { count } = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: TicketStatus.new },
      data: { status: TicketStatus.processing },
    });
    if (count === 0) return;
  } catch (err) {
    console.error(`[auto-resolve-ticket] Failed to mark ticket ${ticket.id} as processing:`, err);
    return;
  }

  try {
    const knowledgeBase = await getKnowledgeBase();
    const firstName = getFirstName(ticket.senderName);

    const { object } = await generateObject({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      schema: resolutionSchema,
      temperature: 0,
      system:
        "You are a support assistant. Answer the customer's ticket using ONLY the knowledge base below — " +
        "never invent policy or information that isn't in it. Follow the knowledge base's own \"Escalation Rules\" " +
        "section strictly, and escalate to a human (resolved: false) whenever you are not fully confident the " +
        "knowledge base fully resolves the ticket.\n\n" +
        "Respond with JSON. Set resolved to true and include a reply only when the knowledge base fully answers " +
        "the ticket. Otherwise set resolved to false and set reply to null.\n\n" +
        `When resolved is true, write the reply as a complete support email in a professional, customer-friendly ` +
        `tone, formatted as plain text with a blank line between each part:\n` +
        `1. A greeting addressing the customer by their first name, exactly: "Hi ${firstName},"\n` +
        `2. One or more short paragraphs answering the question using only the knowledge base.\n` +
        `3. A sign-off ("Best regards," or similar) on its own line, followed by "Code with Mosh Support" on the ` +
        `next line.\n` +
        `Do not use markdown syntax (no asterisks, headers, or bullet characters) since the reply is displayed as ` +
        `plain text.\n\n` +
        `Knowledge base:\n${knowledgeBase}`,
      prompt: `Subject: ${ticket.subject}\n\nMessage: ${ticket.body}`,
    });

    const reply = object.resolved && object.reply ? object.reply.trim() : undefined;
    console.log(`[auto-resolve-ticket] Ticket ${ticket.id}: ${reply ? "resolved" : "escalated to human"}`);

    if (reply) {
      // Guard the same way as markOpen: only attach the reply and resolve if nothing else
      // (e.g. an agent) moved the ticket out of "processing" while the AI call was in flight.
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.ticket.updateMany({
          where: { id: ticket.id, status: TicketStatus.processing },
          data: { status: TicketStatus.resolved },
        });
        if (count === 0) return;

        await tx.ticketReply.create({
          data: { ticketId: ticket.id, senderType: ReplySenderType.ai, authorId: null, body: reply },
        });
      });
    } else {
      await markOpen(ticket.id);
    }
  } catch (err) {
    console.error(`[auto-resolve-ticket] Failed for ticket ${ticket.id}:`, err);
    await markOpen(ticket.id);
  }
}
