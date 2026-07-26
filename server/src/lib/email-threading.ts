// Extracts candidate parent message-ids from a raw inbound email's MIME headers, for matching
// against ticket.messageId to detect a reply within an existing thread.
//
// Prefers References (accumulates every message-id in the thread) and falls back to In-Reply-To
// when References is absent or empty. Header lookup is case-insensitive since RFC 5322 header
// names aren't case-sensitive and Resend's Record<string, string> doesn't guarantee casing.
//
// Every id is normalized to the angle-bracketed form (<id>) — confirmed empirically that
// ticket.messageId is always stored bracketed, since it's Resend's `message_id` field saved
// unmodified. Header tokens are already bracketed per RFC 5322 in the common case; this just
// guards against a client that sends a bare id, so the comparison against ticket.messageId
// never silently mismatches on bracket presence.
//
// Never throws. Returns [] when headers are null/missing or neither header is present — callers
// must treat that as "no thread match" and fall back to creating a new ticket.
export function extractReferencedMessageIds(headers: Record<string, string> | null | undefined): string[] {
  if (!headers) return [];

  const findHeader = (name: string): string | undefined => {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === name && value.trim() !== "") return value;
    }
    return undefined;
  };

  const raw = findHeader("references") ?? findHeader("in-reply-to");
  if (!raw) return [];

  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.startsWith("<") && token.endsWith(">") ? token : `<${token}>`));
}
