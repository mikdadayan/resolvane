import { z } from "zod";

export const Role = {
  admin: "admin",
  agent: "agent",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().trim().min(8, "Password must be at least 8 characters"),
  role: z.enum([Role.admin, Role.agent]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().trim().refine(
    (val) => val === "" || val.length >= 8,
    "Password must be at least 8 characters"
  ),
  role: z.enum([Role.admin, Role.agent]),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
