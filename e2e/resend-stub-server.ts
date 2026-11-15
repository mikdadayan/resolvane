/** Local Resend API stub for integration and browser tests; never sends email. */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const fixtures = new Map<string, unknown>();
const PORT = Number(process.env.RESEND_STUB_PORT ?? 3002);

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/emails" && req.method === "POST") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: randomUUID() }));
    return;
  }
  const match = url.pathname.match(/^\/emails\/receiving\/([^/]+)$/);
  if (!match) {
    res.writeHead(404).end("Not found");
    return;
  }
  const id = match[1]!;
  if (req.method === "POST") {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      fixtures.set(id, JSON.parse(Buffer.concat(chunks).toString()));
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end("Invalid JSON");
    }
    return;
  }
  if (req.method === "GET") {
    const fixture = fixtures.get(id);
    res.writeHead(fixture ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify(fixture ?? { name: "not_found", message: "Email not found" }));
    return;
  }
  res.writeHead(405).end("Method not allowed");
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Resend stub server listening on port ${PORT}`);
});
