import type { auth } from "../lib/auth";
import type { WebhookEventPayload } from "resend";

type Session = typeof auth.$Infer.Session.session;
type User = typeof auth.$Infer.Session.user;

declare global {
  namespace Express {
    interface Request {
      session?: Session;
      user?: User;
      resendEvent?: WebhookEventPayload;
      rawBody?: Buffer;
    }
  }
}
