import { Router, type RequestHandler } from "express";
import { hashPassword } from "better-auth/crypto";
import { createUserSchema, updateUserSchema } from "@helpdesk/core";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/require-admin";
import { prisma } from "../lib/prisma";
import { Role } from "../lib/types";
import { validateBody } from "../lib/validation";

const router = Router();

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true };

const listUsers: RequestHandler = async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: userSelect,
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
};

const createUser: RequestHandler = async (req, res) => {
  const data = validateBody(createUserSchema, req.body, res);
  if (!data) return;

  const { name, email, password, role } = data;

  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
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
      role: role as Role,
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
    select: userSelect,
  });

  res.status(201).json({ user });
};

const updateUser: RequestHandler = async (req, res) => {
  const data = validateBody(updateUserSchema, req.body, res);
  if (!data) return;

  const { name, email, password, role } = data;
  const id = req.params["id"] as string;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  if (email !== existing.email) {
    const taken = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (taken) {
      res.status(409).json({ error: "A user with that email already exists." });
      return;
    }
  }

  if (password) {
    const hashedPassword = await hashPassword(password);
    await prisma.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: hashedPassword, updatedAt: new Date() },
    });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, role: role as Role, updatedAt: new Date() },
    select: userSelect,
  });

  res.json({ user });
};

const deleteUser: RequestHandler = async (req, res) => {
  const id = req.params["id"] as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (user.role === "admin") {
    res.status(403).json({ error: "Admin users cannot be deleted." });
    return;
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });

  await Promise.all([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
  ]);

  res.status(204).send();
};

router.get("/", requireAuth, listUsers);
router.post("/", requireAuth, requireAdmin, createUser);
router.patch("/:id", requireAuth, requireAdmin, updateUser);
router.delete("/:id", requireAuth, requireAdmin, deleteUser);

export default router;
