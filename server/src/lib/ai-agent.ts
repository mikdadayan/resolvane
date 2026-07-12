// Fixed, well-known id for the seeded AI auto-resolution agent user (see prisma/seed-ai-agent.ts).
// A ticket's assignedToId being this value is the source of truth for "AI is handling this" /
// "AI resolved this" — never re-derived from replies or other heuristics.
export const AI_AGENT_ID = "ai-agent-id";
