import type { RequestHandler } from "express";
import { timingSafeEqual } from "crypto";

const INBOUND_WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET as string;

// Placeholder shared-secret check until real provider signature verification
// (SendGrid/Mailgun) is wired up once an email provider is chosen.
export const requireWebhookSecret: RequestHandler = (req, res, next) => {
  const provided = req.header("x-webhook-secret") ?? "";

  const providedBuffer = Buffer.from(provided);
  const secretBuffer = Buffer.from(INBOUND_WEBHOOK_SECRET);

  const isValid =
    providedBuffer.length === secretBuffer.length &&
    timingSafeEqual(providedBuffer, secretBuffer);

  if (!isValid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
