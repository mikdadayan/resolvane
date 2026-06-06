import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/require-admin";
import { prisma } from "../lib/prisma";
import { Role } from "../lib/types";

const router = Router();

const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters."),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().trim().min(8, "Password must be at least 8 characters."),
});

router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    const error = result.error.issues[0]?.message ?? "Invalid input.";
    res.status(400).json({ error });
    return;
  }

  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with that email already exists." });
    return;
  }

  const id = crypto.randomUUID();
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      id,
      name,
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
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json({ user });
});

export default router;
