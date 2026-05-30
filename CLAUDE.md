# Helpdesk — Project Context

An AI-powered ticket management system. Support emails arrive as tickets, which are automatically classified and summarized by Claude. Agents can review AI-suggested replies before sending.

## Structure

```
helpdesk/
├── client/     # React + Vite + TypeScript (port 5173)
└── server/     # Bun + Express + TypeScript (port 3000)
```

## Running the apps

```sh
# Server
cd server && bun --hot src/index.ts

# Client
cd client && bun dev
```

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, React Router v7, shadcn/ui
- **Backend**: Bun, Express, TypeScript
- **Database**: PostgreSQL + Prisma
- **Auth**: better-auth (email/password, database-backed sessions via Prisma adapter)
- **AI**: Anthropic Claude API
- **Email**: SendGrid or Mailgun

## Client UI conventions

- **Component library**: shadcn/ui — add components with `bunx shadcn@latest add <component>`
- **Path alias**: `@/` resolves to `client/src/` — always use `@/` for imports, never relative paths across directories
- **Styling**: Tailwind CSS v4 utility classes only — no custom CSS files. Use shadcn semantic tokens (`bg-background`, `text-foreground`, `text-destructive`, etc.) over raw Tailwind color classes where possible
- **No `tailwind.config.js`**: v4 is CSS-first; all theme config lives in `src/index.css` under `@theme inline`
- **Pages**: one file per page under `src/pages/`, one file per component under `src/components/`

## Client file layout

```
client/src/
├── components/
│   ├── ui/          # shadcn-generated components (do not hand-edit)
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   └── ProtectedRoute.tsx
├── lib/
│   ├── auth-client.ts
│   └── utils.ts     # shadcn cn() helper
├── pages/
│   ├── LoginPage.tsx
│   └── HomePage.tsx
├── index.css        # Tailwind imports + shadcn theme tokens
└── main.tsx
```

## Authentication

**Library**: better-auth with Prisma adapter (PostgreSQL).

### How it works
- Sessions are database-backed (stored in the `session` table via Prisma).
- Sign-up is **disabled** — only the seeded admin account can exist initially. New users must be created manually.
- The user model has a custom `role` field: `"admin"` | `"agent"` (defaults to `"agent"`, not settable by the client).
- All auth routes are mounted at `/api/auth/*` on the server via `toNodeHandler(auth)` — this must be registered **before** `express.json()`.

### Server

```ts
// server/src/lib/auth.ts — auth instance
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [...],
  user: { additionalFields: { role: { type: ["admin", "agent"] } } },
});
```

```ts
// Protecting an Express route — use the requireAuth middleware
import { requireAuth } from "./middleware/require-auth";
app.get("/api/me", requireAuth, (req, res) => { ... });
// req.user and req.session are populated after the middleware runs
```

### Client

```ts
// client/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({ baseURL: import.meta.env.VITE_SERVER_BASE_URL });

// Usage in components
const { data: session, isPending } = authClient.useSession();
await authClient.signIn.email({ email, password, fetchOptions: { onSuccess: () => navigate("/") } });
await authClient.signOut({ fetchOptions: { onSuccess: () => navigate("/login") } });
```

`ProtectedRoute` wraps all authenticated pages — redirects to `/login` if no session, shows a spinner while `isPending`.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | server | JWT signing secret — generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | server | Public URL of the server (e.g. `http://localhost:3000`) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | server | Comma-separated list of allowed client origins |
| `VITE_SERVER_BASE_URL` | client | Base URL for all API calls (e.g. `http://localhost:3000`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | server | Seed credentials — run `bun prisma/seed.ts` to create the admin user |

## Documentation

Always use **context7** (`mcp__context7`) to fetch up-to-date documentation before using any library or framework. Do not rely on training data for API syntax, configuration, or version-specific behavior.

```
# Example: resolve the library ID first, then fetch docs
mcp__context7__resolve-library-id → mcp__context7__query-docs
```

Libraries in use: `express`, `react`, `react-router-dom`, `prisma`, `tailwindcss`, `@anthropic-ai/sdk`, `better-auth`, `cors`, `shadcn`, `lucide-react`, `react-hook-form`, `zod`.
