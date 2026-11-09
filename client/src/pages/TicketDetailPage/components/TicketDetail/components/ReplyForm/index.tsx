import { runtimeConfig } from "@/lib/runtime-config";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createReplySchema, type CreateReplyInput } from "@resolvane/core";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

async function polishReplyRequest(ticketId: string, body: string): Promise<{ body: string }> {
  const res = await axios.post(
    `${runtimeConfig.apiBaseUrl}/api/tickets/${ticketId}/polish-reply`,
    { body },
    { withCredentials: true }
  );
  return res.data;
}

function getPolishErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return "Failed to polish reply. Please try again.";
}

interface Props {
  ticketId: string;
  onSubmit: (data: CreateReplyInput) => Promise<unknown>;
  isPending: boolean;
  error?: string | null;
}

export default function ReplyForm({ ticketId, onSubmit, isPending, error }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
  });

  const body = watch("body");

  const polishMutation = useMutation({
    mutationFn: (currentBody: string) => polishReplyRequest(ticketId, currentBody),
    onSuccess: (data) => setValue("body", data.body),
  });

  async function handleFormSubmit(data: CreateReplyInput) {
    try {
      await onSubmit(data);
      reset();
    } catch {
      // error is surfaced via the `error` prop; keep the draft so the user can retry
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-2">
      <Textarea
        placeholder="Write a reply..."
        rows={4}
        aria-invalid={!!errors.body}
        aria-label="Reply"
        {...register("body")}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {polishMutation.error && (
        <p className="text-sm text-destructive">{getPolishErrorMessage(polishMutation.error)}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-ai-accent/30 text-ai-accent hover:bg-ai-surface hover:text-ai-accent"
          disabled={!body?.trim() || polishMutation.isPending || isPending}
          onClick={() => polishMutation.mutate(body)}
        >
          <Sparkles className="size-3.5" />
          {polishMutation.isPending ? "Polishing…" : "Polish"}
        </Button>
        <Button type="submit" disabled={!body?.trim() || isPending || polishMutation.isPending}>
          {isPending ? "Sending…" : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}
