import DOMPurify from "dompurify";
import type { TicketDetail } from "../../../../types";

type Props = {
  ticket: TicketDetail;
};

export default function TicketInfo({ ticket }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">From: </span>
          {ticket.senderName} ({ticket.senderEmail})
        </p>
        <p>
          <span className="text-muted-foreground">Created: </span>
          {new Date(ticket.receivedAt).toLocaleString()}
        </p>
        <p>
          <span className="text-muted-foreground">Updated: </span>
          {new Date(ticket.updatedAt).toLocaleString()}
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="font-medium text-foreground">Message</p>
        <p className="text-sm text-muted-foreground mb-3">From {ticket.senderName}</p>
        {ticket.bodyHtml ? (
          <div
            className="text-foreground"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.bodyHtml) }}
          />
        ) : (
          <p className="whitespace-pre-wrap text-foreground">{ticket.body}</p>
        )}
      </div>
    </>
  );
}
