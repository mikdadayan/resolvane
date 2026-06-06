import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().trim().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "agent"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().trim().refine(
    (val) => val === "" || val.length >= 8,
    "Password must be at least 8 characters"
  ),
  role: z.enum(["admin", "agent"]),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
