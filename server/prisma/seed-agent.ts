/**
 * Seeds the agent test user.
 * Credentials are read from environment variables (loaded from .env.test by
 * the Playwright global-setup via `bun --env-file .env.test`).
 *
 * Idempotent — exits cleanly when the user already exists.
 */

import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/lib/types";

const email = process.env.AGENT_EMAIL!;
const password = process.env.AGENT_PASSWORD!;

if (!email || !password) {
  console.error("AGENT_EMAIL and AGENT_PASSWORD must be set in .env.test");
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  console.log(`Agent user already exists: ${email}`);
  await prisma.$disconnect();
  process.exit(0);
}

const id = crypto.randomUUID();
const hashedPassword = await hashPassword(password);

await prisma.user.create({
  data: {
    id,
    name: "Agent",
    email,
    emailVerified: true,
    role: Role.agent,
    createdAt: new Date(),
    updatedAt: new Date(),
    accounts: {
      create: {
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  },
});

console.log(`Agent user created: ${email}`);
await prisma.$disconnect();
