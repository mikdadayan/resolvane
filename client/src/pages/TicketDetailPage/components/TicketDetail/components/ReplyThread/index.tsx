import { ReplySenderType } from "@helpdesk/core";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reply } from "../../../../types";

interface Props {
  replies: Reply[] | undefined;
  isPending: boolean;
}

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
      {replies.map((reply) => (
        <div key={reply.id} className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{reply.author?.name ?? "Customer"}</p>
              <Badge variant={reply.senderType === ReplySenderType.agent ? "default" : "outline"}>
                {reply.senderType === ReplySenderType.agent ? "Agent" : "Customer"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(reply.createdAt).toLocaleString()}
            </p>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
        </div>
      ))}
    </div>
  );
}
