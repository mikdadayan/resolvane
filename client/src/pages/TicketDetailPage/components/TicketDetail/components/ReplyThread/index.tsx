import { ReplySenderType } from "@resolvane/core";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reply } from "../../../../types";
import type { VariantProps } from "class-variance-authority";

interface Props {
  replies: Reply[] | undefined;
  isPending: boolean;
}

const SENDER_LABELS: Record<ReplySenderType, string> = {
  [ReplySenderType.agent]: "Agent",
  [ReplySenderType.customer]: "Customer",
  [ReplySenderType.ai]: "AI",
};

const SENDER_BADGE_VARIANTS: Record<ReplySenderType, NonNullable<VariantProps<typeof badgeVariants>["variant"]>> = {
  [ReplySenderType.agent]: "default",
  [ReplySenderType.customer]: "outline",
  [ReplySenderType.ai]: "secondary",
};

export default function ReplyThread({ replies, isPending }: Props) {
  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!replies || replies.length === 0) {
    return <p className="text-sm text-muted-foreground">No replies yet.</p>;
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) =>
        reply.senderType === ReplySenderType.ai ? (
          <div key={reply.id} className="rounded-r-md border-l-2 border-l-ai-accent bg-ai-surface py-3 px-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-ai-accent">
                AI Reply
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
          </div>
        ) : (
          <div key={reply.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{reply.author?.name ?? "Customer"}</p>
                <Badge variant={SENDER_BADGE_VARIANTS[reply.senderType]}>{SENDER_LABELS[reply.senderType]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
          </div>
        )
      )}
    </div>
  );
}
