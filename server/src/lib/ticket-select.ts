export const ticketSelect = {
  id: true,
  subject: true,
  body: true,
  bodyHtml: true,
  senderName: true,
  senderEmail: true,
  status: true,
  category: true,
  receivedAt: true,
  createdAt: true,
  assignedTo: { select: { id: true, name: true } },
} as const;
