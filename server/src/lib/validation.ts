import type { Response } from "express";
import type { ZodType } from "zod";

export function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

export function validateBody<T>(schema: ZodType<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: firstIssue(result.error) });
    return null;
  }
  return result.data;
}

export function validateQuery<T>(schema: ZodType<T>, query: unknown, res: Response): T | null {
  const result = schema.safeParse(query);
  if (!result.success) {
    res.status(400).json({ error: firstIssue(result.error) });
    return null;
  }
  return result.data;
}
