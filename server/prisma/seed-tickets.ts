/**
 * Generates 100 test tickets with randomized subject, status, category,
 * and assigned agent (including unassigned/uncategorized) for manually
 * exercising sorting/filtering/pagination on the Tickets page.
 *
 * Not idempotent — each run adds 100 more tickets.
 */

import { prisma } from "../src/lib/prisma";
import { TicketCategory } from "../src/generated/prisma/enums";
import { AGENT_SETTABLE_TICKET_STATUSES } from "@resolvane/core";

const SUBJECTS = [
  "Cannot log in to my account",
  "Refund request for last order",
  "How do I change my email address",
  "App crashes on startup",
  "Billing charged twice this month",
  "Feature request: dark mode",
  "Password reset link not working",
  "Question about subscription tiers",
  "Unable to upload attachments",
  "Need help exporting my data",
];

const FIRST_NAMES = ["Jane", "John", "Alex", "Priya", "Liam", "Mei", "Carlos", "Sofia", "Noah", "Emma"];
const LAST_NAMES = ["Customer", "Smith", "Lee", "Patel", "Garcia", "Wong", "Brown", "Davis", "Kim", "Nguyen"];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomDateWithinLastDays(days: number): Date {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(past);
}

const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });

// "new" and "processing" are system-driven states owned by the auto-resolve pipeline — seeding
// them directly here would create tickets stuck forever outside that pipeline.
const statuses = [...AGENT_SETTABLE_TICKET_STATUSES];
const categories = [...Object.values(TicketCategory), null];

const tickets = Array.from({ length: 100 }, (_, i) => {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  const senderName = `${firstName} ${lastName}`;
  const senderEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;
  const assignedTo = randomFrom([null, ...users.map((u) => u.id)]);
  const receivedAt = randomDateWithinLastDays(60);

  return {
    subject: `${randomFrom(SUBJECTS)} #${i + 1}`,
    body: "This is a generated test ticket used for manually exercising sorting, filtering, and pagination.",
    senderName,
    senderEmail,
    status: randomFrom(statuses),
    category: randomFrom(categories),
    assignedToId: assignedTo,
    receivedAt,
  };
});

await prisma.ticket.createMany({ data: tickets });

console.log(`Created ${tickets.length} test tickets.`);
await prisma.$disconnect();
