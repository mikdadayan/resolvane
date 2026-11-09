import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { prisma } from "./prisma";
import { TicketCategory } from "@resolvane/core";
import type { ticket } from "../generated/prisma/client";

const VALID_CATEGORIES = Object.values(TicketCategory);

function isValidCategory(value: string): value is TicketCategory {
  return (VALID_CATEGORIES as string[]).includes(value);
}

export async function classifyTicket(ticket: Pick<ticket, "id" | "subject" | "body">): Promise<void> {
  try {
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      temperature: 0,
      system:
      "You classify customer support tickets into exactly one of these categories. Reply with the category name only — no punctuation, no explanation.\n\n" +
      "general_question: How-to questions, account navigation, password changes, general guidance, or anything that is not a bug or a billing issue.\n" +
      "technical_question: Bugs, errors, crashes, unexpected behaviour, or platform malfunctions.\n" +
      "refund_request: Requests for refunds, billing disputes, or payment issues.\n" +
      "unknown: Gibberish, random characters, spam, or any content that does not resemble a real support request.",
      prompt: `Subject: ${ticket.subject}\n\nMessage: ${ticket.body}`,
    });

    const category = text.trim().toLowerCase();
    if (!isValidCategory(category)) {
      console.error(`[classify-ticket] Unexpected category "${category}" for ticket ${ticket.id}`);
      return;
    }

    await prisma.ticket.update({ where: { id: ticket.id }, data: { category } });
    console.log(`[classify-ticket] Ticket ${ticket.id} classified as ${category}`);
  } catch (err) {
    console.error(`[classify-ticket] Failed for ticket ${ticket.id}:`, err);
  }
}
