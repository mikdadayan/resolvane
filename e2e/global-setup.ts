/**
 * Playwright global setup.
 *
 * Seeds the test database with the admin, agent, and AI auto-resolution agent
 * users before any test runs. All three seed scripts are idempotent — they
 * exit cleanly when the user already exists, so repeated runs and CI caches
 * are safe. The AI agent user must exist before any webhook e2e test creates
 * a ticket: the inbound-email webhook route always assigns new tickets to
 * AI_AGENT_ID, and that's a foreign key the ticket insert would otherwise
 * violate.
 *
 * The seed scripts are run with `bun --env-file .env.test` so they connect to
 * the test database and pick up the correct credentials without polluting the
 * main application's .env file.
 */

import { execFileSync } from "child_process";
import path from "path";

// __dirname is available here because Playwright compiles global-setup with
// its CJS transform.  import.meta.dirname must not be used in this file.
const SERVER_DIR = path.resolve(__dirname, "../server");

function seed(script: string) {
  execFileSync("bun", ["--env-file", ".env.test", script], {
    cwd: SERVER_DIR,
    stdio: "inherit",
  });
}

export default async function globalSetup() {
  seed("prisma/seed.ts");
  seed("prisma/seed-agent.ts");
  seed("prisma/seed-ai-agent.ts");
}
