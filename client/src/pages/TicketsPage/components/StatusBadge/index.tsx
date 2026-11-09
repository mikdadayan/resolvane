import { TicketStatus } from "@resolvane/core";
import { STATUS_LABELS } from "../../constants";

type Props = {
  status: TicketStatus;
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `var(--status-${status})` }}
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
