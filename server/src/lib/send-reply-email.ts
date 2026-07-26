import { resend } from "./resend";

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL as string;
const RESEND_RECEIVING_DOMAIN = process.env.RESEND_RECEIVING_DOMAIN as string;

// Resend receiving domains are catch-all — any address at this domain routes inbound mail to
// our webhook, so a fixed local part is fine here (no per-address registration needed).
const REPLY_TO_ADDRESS = `support@${RESEND_RECEIVING_DOMAIN}`;

type SendReplyEmailParams = {
  to: string;
  subject: string;
  body: string;
  messageId: string | null;
};

// `from` stays the shared/verified sending address, but replyTo must point at our receiving
// domain — otherwise a customer hitting "Reply" addresses their reply back to `from` itself,
// which Resend has no inbound route for, so it never reaches our webhook (see the
// inboundEmail thread-matching logic in routes/webhooks.ts, which depends on the reply
// actually arriving here). The In-Reply-To/References headers make the email client render
// this as a reply in the customer's inbox and are what that thread-matching looks for.
//
// Throws on failure — callers must send before persisting a reply, so a delivery failure never
// leaves a reply recorded that the customer never actually received.
export async function sendReplyEmail({ to, subject, body, messageId }: SendReplyEmailParams): Promise<void> {
  const { error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    replyTo: REPLY_TO_ADDRESS,
    subject: subject.startsWith("Re: ") ? subject : `Re: ${subject}`,
    text: body,
    headers: messageId ? { "In-Reply-To": messageId, References: messageId } : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }
}
