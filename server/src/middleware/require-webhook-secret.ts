import type { RequestHandler } from "express";
import { resend } from "../lib/resend";

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET as string;

export const requireWebhookSecret: RequestHandler = (req, res, next) => {
  const id = req.header("svix-id");
  const timestamp = req.header("svix-timestamp");
  const signature = req.header("svix-signature");

  if (!id || !timestamp || !signature || !req.rawBody) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    req.resendEvent = resend.webhooks.verify({
      payload: req.rawBody.toString("utf-8"),
      headers: { id, timestamp, signature },
      webhookSecret: RESEND_WEBHOOK_SECRET,
    });
  } catch (err) {
    console.error("Resend webhook signature verification failed:", err);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
