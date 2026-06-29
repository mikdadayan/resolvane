import axios from "axios";
import { Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

async function fetchSummary(ticketId: string): Promise<{ summary: string }> {
  const res = await axios.post(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets/${ticketId}/summarize`,
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
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
          <p className="font-medium mb-1">Summary</p>
          <p className="text-muted-foreground leading-relaxed">{data.summary}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      )}
    </div>
  );
}
