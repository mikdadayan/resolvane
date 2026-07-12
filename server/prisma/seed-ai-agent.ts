/**
 * Seeds the AI auto-resolution agent user.
 * Credentials are read from environment variables.
 *
 * Idempotent — exits cleanly when the user already exists.
 */

import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/lib/types";
import { AI_AGENT_ID } from "../src/lib/ai-agent";

const email = process.env.AI_AGENT_EMAIL!;
const password = process.env.AI_AGENT_PASSWORD!;

if (!email || !password) {
  console.error("AI_AGENT_EMAIL and AI_AGENT_PASSWORD must be set in .env");
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { id: AI_AGENT_ID } });

if (existing) {
  console.log(`AI agent user already exists: ${AI_AGENT_ID}`);
  await prisma.$disconnect();
  process.exit(0);
}

const hashedPassword = await hashPassword(password);

await prisma.user.create({
  data: {
    id: AI_AGENT_ID,
    name: "AI",
    email,
    emailVerified: true,
    role: Role.agent,
    createdAt: new Date(),
    updatedAt: new Date(),
    accounts: {
      create: {
        id: crypto.randomUUID(),
        accountId: AI_AGENT_ID,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  },
});

console.log(`AI agent user created: ${email} (${AI_AGENT_ID})`);
await prisma.$disconnect();
