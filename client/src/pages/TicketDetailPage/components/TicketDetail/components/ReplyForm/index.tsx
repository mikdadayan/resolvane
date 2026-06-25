import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createReplySchema, type CreateReplyInput } from "@helpdesk/core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSubmit: (data: CreateReplyInput) => Promise<unknown>;
  isPending: boolean;
  error?: string | null;
}

export default function ReplyForm({ onSubmit, isPending, error }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
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
      {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}
