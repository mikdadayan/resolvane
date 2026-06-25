import type { Response } from "express";
import { z, type ZodType } from "zod";

const idSchema = z.uuid();

export function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

// All ids in this app are uuids, so a malformed id can never match — reject before hitting the DB.
export function validateId(id: string, res: Response, notFoundMessage = "Not found"): string | null {
  const result = idSchema.safeParse(id);
  if (!result.success) {
    res.status(404).json({ error: notFoundMessage });
    return null;
  }
  return result.data;
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
