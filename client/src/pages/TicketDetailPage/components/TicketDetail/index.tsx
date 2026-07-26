import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type CreateReplyInput } from "@helpdesk/core";
import type { Reply, TicketDetail as TicketDetailType } from "../../types";
import TicketInfo from "./components/TicketInfo";
import TicketSummary from "./components/TicketSummary";
import ReplyThread from "./components/ReplyThread";
import ReplyForm from "./components/ReplyForm";

async function fetchReplies(id: string): Promise<Reply[]> {
  const res = await axios.get(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets/${id}/replies`,
    { withCredentials: true }
  );
  return res.data.replies;
}

async function createReply(id: string, data: CreateReplyInput): Promise<Reply> {
  const res = await axios.post<Reply>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets/${id}/replies`,
    data,
    { withCredentials: true }
  );
  return res.data;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return "Something went wrong. Please try again.";
}

type Props = {
  ticket: TicketDetailType;
  id: string;
};

export default function TicketDetail({ ticket, id }: Props) {
  const queryClient = useQueryClient();

  const { data: replies, isPending: repliesPending } = useQuery({
    queryKey: ["ticket", id, "replies"],
    queryFn: () => fetchReplies(id),
  });

  const replyMutation = useMutation({
    mutationFn: (data: CreateReplyInput) => createReply(id, data),
    onSuccess: (reply) => {
      queryClient.setQueryData<Reply[]>(["ticket", id, "replies"], (prev) => [
        ...(prev ?? []),
        reply,
      ]);
    },
  });

  return (
    <div className="md:col-span-3 space-y-6">
      <h1 className="font-serif text-2xl font-medium tracking-tight text-foreground">{ticket.subject}</h1>

      <TicketInfo ticket={ticket} />

      <TicketSummary ticketId={id} />

      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">Replies</h2>
        <ReplyThread replies={replies} isPending={repliesPending} />
      </div>

      <ReplyForm
        ticketId={id}
        onSubmit={(data) => replyMutation.mutateAsync(data)}
        isPending={replyMutation.isPending}
        error={replyMutation.error ? getErrorMessage(replyMutation.error) : null}
      />
    </div>
  );
}
