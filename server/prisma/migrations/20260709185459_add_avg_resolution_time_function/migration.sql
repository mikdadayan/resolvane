-- Computes the average ticket resolution time in milliseconds, across non-deleted
-- resolved/closed tickets that have a resolvedAt timestamp. Returns NULL when no
-- ticket qualifies (matches the previous JS behavior of avgResolutionTimeMs: null).
CREATE OR REPLACE FUNCTION avg_ticket_resolution_time_ms()
RETURNS DOUBLE PRECISION
LANGUAGE sql
STABLE
AS $$
  SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "receivedAt")) * 1000)
  FROM "ticket"
  WHERE "deletedAt" IS NULL
    AND "status" IN ('resolved', 'closed')
    AND "resolvedAt" IS NOT NULL;
$$;
