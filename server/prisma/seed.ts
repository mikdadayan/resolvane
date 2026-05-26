import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/lib/types";

const email = process.env.ADMIN_EMAIL!;
const password = process.env.ADMIN_PASSWORD!;

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  console.log(`Admin user already exists: ${email}`);
  process.exit(0);
}

const id = crypto.randomUUID();
const hashedPassword = await hashPassword(password);

await prisma.user.create({
  data: {
    id,
    name: "Admin",
    email,
    emailVerified: true,
    role: Role.admin,
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

console.log(`Admin user created: ${email}`);
await prisma.$disconnect();
