import { resend } from "./resend";

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL as string;

type SendReplyEmailParams = {
  to: string;
  subject: string;
  body: string;
  messageId: string | null;
};

// One-way notification only — a customer replying to this email creates an
// unrelated new ticket (the inbound webhook has no thread-matching logic).
// The In-Reply-To/References headers just make the email client render it as
// a reply in the customer's inbox.
//
// Throws on failure — callers must send before persisting a reply, so a
// delivery failure never leaves a reply recorded that the customer never
// actually received.
export async function sendReplyEmail({ to, subject, body, messageId }: SendReplyEmailParams): Promise<void> {
  const { error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject: subject.startsWith("Re: ") ? subject : `Re: ${subject}`,
    text: body,
    headers: messageId ? { "In-Reply-To": messageId, References: messageId } : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }
}
