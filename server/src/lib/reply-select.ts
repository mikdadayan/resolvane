export const replySelect = {
  id: true,
  body: true,
  senderType: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;
