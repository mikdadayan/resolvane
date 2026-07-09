import { boss } from "../lib/boss";
import { autoResolveTicket } from "../lib/auto-resolve-ticket";

export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

type AutoResolveTicketJob = { id: string; subject: string; body: string; senderName: string };

export async function startAutoResolveTicketWorker() {
  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE);

  await boss.work<AutoResolveTicketJob>(AUTO_RESOLVE_TICKET_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await autoResolveTicket(job.data);
    }
  });
}
