import { z } from "zod";

export const ReplySenderType = {
  agent: "agent",
  customer: "customer",
  ai: "ai",
} as const;

export type ReplySenderType = (typeof ReplySenderType)[keyof typeof ReplySenderType];

export const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply body is required"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
