/**
 * Stands in for Resend's API during e2e tests.
 *
 * The webhook handler calls `resend.emails.receiving.get(email_id)` to fetch
 * the full email body/HTML after verifying an `email.received` webhook event.
 * The `resend` SDK reads `RESEND_BASE_URL` (set in server/.env.test) instead of
 * the real `https://api.resend.com`, so it hits this server instead.
 *
 * Tests seed a fixture via POST before POSTing the signed webhook event, so the
 * server's follow-up GET resolves deterministically without any real network
 * access to Resend.
 */

const fixtures = new Map<string, unknown>();

const PORT = Number(process.env.RESEND_STUB_PORT ?? 3002);

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    // Reply delivery stays local during full-stack tests.
    if (url.pathname === "/emails" && req.method === "POST") {
      return Response.json({ id: crypto.randomUUID() });
    }

    const match = url.pathname.match(/^\/emails\/receiving\/([^/]+)$/);

    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const id = match[1];

    if (req.method === "POST") {
      return req.json().then((body) => {
        fixtures.set(id, body);
        return new Response(null, { status: 204 });
      });
    }

    if (req.method === "GET") {
      const fixture = fixtures.get(id);
      if (!fixture) {
        // The resend SDK's own `fetchRequest` wraps whatever this endpoint
        // returns as `{ data, error }` for the caller — on a non-2xx response
        // it JSON.parses the raw body directly into `error`. So the body here
        // must be the bare error object, not pre-wrapped.
        return Response.json({ name: "not_found", message: "Email not found" }, { status: 404 });
      }
      // Same reasoning as above: the SDK wraps `await response.json()` as
      // `data` itself, so this endpoint must return the fixture directly —
      // wrapping it in `{ data: fixture, error: null }` here would produce a
      // double-wrapped `{ data: { data: fixture, error: null }, error: null }`
      // on the caller's side.
      return Response.json(fixture);
    }

    return new Response("Method not allowed", { status: 405 });
  },
});

console.log(`Resend stub server listening on port ${PORT}`);
