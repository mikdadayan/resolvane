# Helpdesk — Project Context

An AI-powered ticket management system. Support emails arrive as tickets, automatically classified and summarized by Claude. Agents review AI-suggested replies before sending.

## Structure

```
helpdesk/
├── client/     # React + Vite + TypeScript (port 5173)
├── core/       # Shared zod schemas — imported by both client and server
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
- **Forms**: always use **react-hook-form** with **`zodResolver`** and a **zod** schema — never manage form state with `useState`. Import the schema from `@helpdesk/core` (see below), infer the type with `z.infer<typeof schema>`, and wire up with `useForm<FormValues>({ resolver: zodResolver(schema) })`. Display field errors from `formState.errors` inline beneath each input.
- **Role enum**: always import `Role` from `@helpdesk/core` and use `Role.admin` / `Role.agent` instead of the raw strings `"admin"` / `"agent"`. Never hard-code role strings anywhere in the client — not in conditionals, default values, `SelectItem` values, mock data, or type annotations.

## Server file layout

```
server/src/
├── lib/
│   ├── auth.ts            # better-auth instance
│   ├── prisma.ts          # Prisma client singleton
│   ├── types.ts           # re-exports Prisma enums (e.g. Role)
│   ├── validation.ts      # firstIssue, validateBody — shared zod request validation
│   └── ticket-select.ts   # shared Prisma `select` shape for ticket queries
├── middleware/
│   ├── require-auth.ts           # validates session, populates req.user and req.session
│   ├── require-admin.ts          # checks req.user.role === "admin", returns 403 otherwise
│   └── require-webhook-secret.ts # checks x-webhook-secret header for inbound webhooks
├── routes/
│   ├── users.ts           # GET /api/users, POST /api/users (admin-only) — session-authed
│   ├── tickets.ts         # GET /api/tickets — session-authed
│   └── webhooks.ts        # POST /api/webhooks/inbound-email — shared-secret authed, no session
├── types/
│   └── express.d.ts       # augments Express Request with user and session types
└── index.ts               # app entry point — mounts routes
```

Key server conventions:
- Auth handler (`toNodeHandler(auth)`) must be registered at `/api/auth/*` **before** `express.json()`.
- Use `requireAuth` on any authenticated route; use `requireAuth, requireAdmin` on admin-only routes.
- `req.user` and `req.session` types come from `typeof auth.$Infer.Session` via the express augmentation in `types/express.d.ts`.
- New users are created manually by scripting against Prisma directly (see `prisma/seed.ts` for the pattern — hash with `hashPassword` from `better-auth/crypto`).
- Rate limiting on `/api/auth/sign-in` is active **only in production** (`NODE_ENV=production`).
- Required env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `INBOUND_WEBHOOK_SECRET`) are validated at startup — the server throws immediately if any are missing.
- **Request body validation**: always use **zod** to validate request bodies via the shared `validateBody(schema, req.body, res)` helper from `server/src/lib/validation.ts`. It runs `safeParse`, and on failure writes the first issue message as `{ error }` with a 400 status and returns `null` — on success it returns the parsed data. Call it at the top of the handler and bail out with `if (!data) return;`. Never inline `schema.safeParse(...)` + manual 400 handling, and never redefine this logic locally in a route file.
- **Webhooks live under `/api/webhooks`, never mixed into a resource's own router**: any server-to-server endpoint authenticated by a shared secret (via `requireWebhookSecret`) instead of a user session belongs in `server/src/routes/webhooks.ts`, mounted at `/api/webhooks`. Resource routers like `tickets.ts` stay exclusively session-authed (`requireAuth`) — don't add a `requireWebhookSecret`-only route to a session-authed router just because it operates on the same resource. Share Prisma `select` shapes between the two (e.g. `ticket-select.ts`) instead of duplicating them.
- **Route handlers are named functions, not inline callbacks**: define each handler as a `const handlerName: RequestHandler = async (req, res) => { ... }` above the router, then register all routes together at the bottom of the file (e.g. `router.get("/", requireAuth, requireAdmin, listUsers);`). Never pass an inline `async (req, res) => { ... }` directly to `router.get/post/patch/delete`.

## Client file layout

```
client/src/
├── components/          # shared across multiple pages — reusable only
│   ├── ui/              # shadcn-generated (do not hand-edit)
│   ├── AdminRoute.tsx
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   └── ProtectedRoute.tsx
├── lib/
│   ├── auth-client.ts
│   └── utils.ts
├── pages/
│   ├── SimplePage.tsx           # single-file form: no private sub-components
│   └── FooPage/                 # folder form: page has private sub-components
│       ├── index.tsx            # page component — imported as "@/pages/FooPage"
│       ├── types.ts             # shared shape(s) used by the page and its private components (e.g. `Foo`)
│       ├── constants.ts         # shared lookup maps/labels used by the page and its private components
│       └── components/          # components used only by this page
│           ├── Bar.tsx          # single-file form: no further private sub-components
│           └── Baz/             # folder form: this sub-component has enough of its own logic to warrant one
│               └── index.tsx    # imported as "./components/Baz"
├── index.css
└── main.tsx
```

**Component placement rules — always apply these:**
- **`pages/FooPage/components/`** — any component that only makes sense within one specific page. Never import these from another page.
- **`src/components/`** — components reused across two or more pages or features. If a component is not yet shared, keep it in the page folder until it is.
- **Page file vs. folder:** use a single `FooPage.tsx` file when the page has no private sub-components. As soon as private components are added, convert to the folder form (`FooPage/index.tsx` + `FooPage/components/`). The import path at the call site never changes.
- **Sub-component file vs. folder:** the same single-file-vs-folder rule applies one level down. A private sub-component starts as `components/Bar.tsx`; convert it to `components/Bar/index.tsx` only once it grows enough internal complexity (e.g. its own `useReactTable`/state wiring) to read better as its own small module — not by default.
- **Split page-level concerns from presentational sub-components**: the page's `index.tsx` owns URL/query state, data fetching, and handlers; it passes plain data + callback props down. Sub-components (e.g. a table or a filter bar) stay presentational/self-contained and don't reach into router or query hooks directly unless the state is genuinely local to them (e.g. a debounced search input's own keystroke state) — see `TicketsPage/index.tsx` + `TicketsPage/components/TicketsTable` + `TicketsPage/components/TicketsFilters` for the reference shape.
- **`types.ts`/`constants.ts` at the page-folder root**: when a type or a lookup map (e.g. status/category label maps) is needed by both the page and more than one of its private sub-components, lift it to `FooPage/types.ts` / `FooPage/constants.ts` instead of duplicating it or importing one sub-component from another.

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
| `INBOUND_WEBHOOK_SECRET` | server | Shared secret for the inbound email webhook (`x-webhook-secret` header) — generate with `openssl rand -hex 32` |

## Testing

### Component tests (Vitest + React Testing Library)

Component tests live **alongside** their page/component file as `*.test.tsx`:
- Single-file page `FooPage.tsx` → `FooPage.test.tsx` (same folder)
- Folder-form page `FooPage/index.tsx` → `FooPage/index.test.tsx` (inside the folder)
- Page-private component `FooPage/components/Bar.tsx` → `FooPage/components/Bar.test.tsx`

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

## Shared code (`core/`)

The `core/` package (`@helpdesk/core`) holds zod schemas that are used on **both** the client and server. It has no build step — both sides import TypeScript source directly via path aliases.

```
core/src/
├── schemas/
│   └── user.ts      # createUserSchema, CreateUserInput
└── index.ts         # re-exports everything
```

**Rules:**
- Any zod schema shared between client and server lives in `core/src/schemas/`.
- Import as `import { mySchema, type MyInput } from "@helpdesk/core"` — never duplicate schemas in client or server.
- The path alias is configured in `client/tsconfig.app.json` + `client/vite.config.ts` (for the client) and `server/tsconfig.json` (for Bun). No install step needed.
- `core` has no runtime dependencies — only `zod` as a peer dependency (already installed in both client and server).

## Documentation

Always use **context7** (`mcp__context7`) to fetch up-to-date docs before using any library. Do not rely on training data for API syntax or version-specific behavior. Resolve library ID first, then query docs.

Libraries in use: `express`, `react`, `react-router-dom`, `prisma`, `tailwindcss`, `@anthropic-ai/sdk`, `better-auth`, `cors`, `shadcn`, `lucide-react`, `react-hook-form`, `zod`.
