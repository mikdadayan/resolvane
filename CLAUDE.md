# Helpdesk — Project Context

An AI-powered ticket management system. Support emails arrive as tickets, automatically classified and summarized by Claude. Agents review AI-suggested replies before sending.

## Structure

```
helpdesk/
├── client/     # React + Vite + TypeScript (port 5173)
└── server/     # Bun + Express + TypeScript (port 3000)
```

## Running the apps

```sh
cd server && bun --hot src/index.ts
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
- **Styling**: Tailwind CSS v4 utility classes only — no custom CSS files. Use shadcn semantic tokens over raw Tailwind color classes where possible
- **No `tailwind.config.js`**: v4 is CSS-first; all theme config lives in `src/index.css` under `@theme inline`
- **Pages**: one file per page under `src/pages/`, one file per component under `src/components/`
- **Data fetching**: always use **axios** for HTTP requests and **TanStack Query** (`useQuery`, `useMutation`) for server state — never use raw `fetch` or `useEffect` for data fetching

## Server file layout

```
server/src/
├── lib/
│   ├── auth.ts          # better-auth instance
│   ├── prisma.ts        # Prisma client singleton
│   └── types.ts         # re-exports Prisma enums (e.g. Role)
├── middleware/
│   ├── require-auth.ts  # validates session, populates req.user and req.session
│   └── require-admin.ts # checks req.user.role === "admin", returns 403 otherwise
├── routes/
│   └── users.ts         # GET /api/users, POST /api/users (admin-only)
├── types/
│   └── express.d.ts     # augments Express Request with user and session types
└── index.ts             # app entry point — mounts routes
```

Key server conventions:
- Auth handler (`toNodeHandler(auth)`) must be registered at `/api/auth/*` **before** `express.json()`.
- Use `requireAuth` on any authenticated route; use `requireAuth, requireAdmin` on admin-only routes.
- `req.user` and `req.session` types come from `typeof auth.$Infer.Session` via the express augmentation in `types/express.d.ts`.
- New users are created manually by scripting against Prisma directly (see `prisma/seed.ts` for the pattern — hash with `hashPassword` from `better-auth/crypto`).
- Rate limiting on `/api/auth/sign-in` is active **only in production** (`NODE_ENV=production`).
- Required env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) are validated at startup — the server throws immediately if any are missing.
- **Request body validation**: always use **zod** (`safeParse`) to validate request bodies. Define a schema above the route handler and return the first issue message as `{ error }` with a 400 status on failure.

## Client file layout

```
client/src/
├── components/
│   ├── ui/              # shadcn-generated (do not hand-edit)
│   ├── AdminRoute.tsx   # redirects non-admins to /
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   └── ProtectedRoute.tsx  # redirects unauthenticated users to /login
├── lib/
│   ├── auth-client.ts
│   └── utils.ts
├── pages/
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   └── UsersPage.tsx    # admin-only
├── index.css
└── main.tsx
```

## Authentication

- Sessions are database-backed via Prisma.
- Sign-up is **disabled** — users must be created manually (see `server/prisma/seed.ts` for the pattern).
- Users have a `role` field: `"admin"` | `"agent"` (defaults to `"agent"`, not settable by the client).
- Auth routes are mounted at `/api/auth/*` and must be registered **before** `express.json()`.
- `inferAdditionalFields<typeof auth>()` plugin is required in `auth-client.ts` for `session.user.role` to be typed on the client.

### Route protection

- `ProtectedRoute` — requires a valid session; wraps all authenticated pages.
- `AdminRoute` — requires `role === "admin"`; nested inside `ProtectedRoute` in the route tree.
- Navbar shows the Users link only to admins (`session.user.role === "admin"`).

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | server | Signing secret — generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | server | Public URL of the server |
| `BETTER_AUTH_TRUSTED_ORIGINS` | server | Comma-separated allowed client origins |
| `VITE_SERVER_BASE_URL` | client | Base URL for all API calls |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | server | Seed credentials for the admin user |

## Testing

### Component tests (Vitest + React Testing Library)

Component tests live alongside their page/component file as `*.test.tsx`.

```sh
bun run test:components   # run all component tests (verbose)
bun run test              # run all component tests (silent)
bun run test:watch        # watch mode
```

**Stack**: Vitest + jsdom + `@testing-library/react` + `@testing-library/jest-dom` + MSW.

**Shared render helper** — always use `renderWithQuery` from `@/test/utils` instead of calling `render` directly. It wraps the component in `QueryClientProvider` (retries disabled) and `MemoryRouter`:

```ts
import { renderWithQuery } from "@/test/utils";

renderWithQuery(<MyPage />);
```

**HTTP mocking** — use MSW (`msw/node` + `setupServer`) to intercept requests at the network level. Set up handlers with `http.get` / `http.post` from `msw`, and always stub `VITE_SERVER_BASE_URL`:

```ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";

vi.stubEnv("VITE_SERVER_BASE_URL", "http://localhost:3000");

const server = setupServer(
  http.get("http://localhost:3000/api/something", () =>
    HttpResponse.json({ ... })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Use `server.use(...)` inside an individual test to override a handler for that test only (e.g. error cases).

**What to test in component tests**: loading/skeleton state, rendered data, error messages, role-based rendering. Do not test routing or authentication flows — those belong in e2e tests.

**TypeScript**: `globals: true` is set in vitest config and `"vitest/globals"` is in `tsconfig.app.json` types — `describe`, `it`, `expect`, `beforeAll`, etc. are available without importing. Only import `vi` explicitly when needed.

### E2e tests (Playwright)

E2e tests live in `e2e/` and run with Playwright. Always use the **`playwright-e2e-writer`** agent to write tests — never write them inline.

```sh
bun run test:e2e        # run all e2e tests (headless)
bun run test:e2e:ui     # open Playwright UI
```

## Documentation

Always use **context7** (`mcp__context7`) to fetch up-to-date docs before using any library. Do not rely on training data for API syntax or version-specific behavior. Resolve library ID first, then query docs.

Libraries in use: `express`, `react`, `react-router-dom`, `prisma`, `tailwindcss`, `@anthropic-ai/sdk`, `better-auth`, `cors`, `shadcn`, `lucide-react`, `react-hook-form`, `zod`.
