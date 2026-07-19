import * as Sentry from "@sentry/node";
import { boss } from "../lib/boss";
import { classifyTicket } from "../lib/classify-ticket";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

type ClassifyTicketJob = { id: string; subject: string; body: string };

export async function startClassifyTicketWorker() {
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);

  await boss.work<ClassifyTicketJob>(CLASSIFY_TICKET_QUEUE, async (jobs) => {
    for (const job of jobs) {
      try {
        await classifyTicket(job.data);
      } catch (err) {
        Sentry.captureException(err);
        throw err;
      }
    }
  });
}
