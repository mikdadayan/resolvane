import { runtimeConfig } from "@/lib/runtime-config";
import axios from "axios";
import { Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

async function fetchSummary(ticketId: string): Promise<{ summary: string }> {
  const res = await axios.post(
    `${runtimeConfig.apiBaseUrl}/api/tickets/${ticketId}/summarize`,
    {},
    { withCredentials: true }
  );
  return res.data;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return "Failed to generate summary. Please try again.";
}

interface Props {
  ticketId: string;
}

export default function TicketSummary({ ticketId }: Props) {
  const { mutate, isPending, data, error } = useMutation({
    mutationFn: () => fetchSummary(ticketId),
  });

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => mutate()}
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? "Summarizing…" : data ? "Re-generate" : "Summarize"}
      </Button>

      {data && (
        <div className="rounded-r-md border-l-2 border-l-ai-accent bg-ai-surface py-3 px-4 text-sm">
          <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-ai-accent">
            AI Summary
          </p>
          <p className="text-foreground leading-relaxed">{data.summary}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      )}
    </div>
  );
}
