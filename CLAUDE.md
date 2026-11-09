# Resolvane — Project Context

An AI-powered ticket management system. Support emails arrive as tickets, automatically classified and summarized by Claude. Agents review AI-suggested replies before sending.

## Structure

```
helpdesk/
├── client/     # React + Vite + TypeScript (port 5173)
├── core/       # Shared zod schemas — imported by both client and server
└── server/     # Bun + Express + TypeScript (port 3000)
```

## Running the apps

Install all workspace dependencies with `bun install` from the repository root. The workspace packages are named `@resolvane/client`, `@resolvane/server`, and `@resolvane/core` in the `client/`, `server/`, and `core/` directories. The root `bun.lock` is shared by all three packages. `bunfig.toml` enables isolated installs, with dependencies symlinked from `node_modules/.bun` and local workspace packages linked to their source directories.

Root scripts use Turborepo: `bun run dev` starts both apps, `bun run dev:client` / `bun run dev:server` start one app, and `bun run build`, `bun run lint`, and `bun run test` run the existing workspace scripts. Add `--filter=@resolvane/client` to target one package. The server runs TypeScript directly and core exports source, so neither currently has a build script.

`turbo.json` caches successful build, lint, and component test tasks. Its `transit` task propagates shared-package source changes into consumer cache keys. Client builds additionally track server sources because the auth client imports server auth types. Build/test hashes include local `.env*` files and declared environment variables. Development tasks remain persistent and uncached. Local cache files live in `.turbo/cache`; GitHub Actions persists them with `actions/cache` between runs. E2E tests continue to run directly through Playwright because they depend on live services.

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
- **Forms**: always use **react-hook-form** with **`zodResolver`** and a **zod** schema — never manage form state with `useState`. Import the schema from `@resolvane/core` (see below), infer the type with `z.infer<typeof schema>`, and wire up with `useForm<FormValues>({ resolver: zodResolver(schema) })`. Display field errors from `formState.errors` inline beneath each input.
- **Role enum**: always import `Role` from `@resolvane/core` and use `Role.admin` / `Role.agent` instead of the raw strings `"admin"` / `"agent"`. Never hard-code role strings anywhere in the client — not in conditionals, default values, `SelectItem` values, mock data, or type annotations.

## Server file layout

```
server/src/
├── lib/
│   ├── auth.ts            # better-auth instance
│   ├── prisma.ts          # Prisma client singleton
│   ├── types.ts           # re-exports Prisma enums (e.g. Role)
│   ├── validation.ts      # firstIssue, validateBody, validateId — shared zod request validation
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
- **Route `:id` param validation**: every route handler that takes an `:id` URL param (e.g. `RequestHandler<{ id: string }>`) must validate it with `validateId(req.params.id, res, "X not found")` from `server/src/lib/validation.ts` **before** any Prisma call. All ids in this app are uuids (`@id @default(uuid())` / `crypto.randomUUID()`), so a malformed id can never match — rejecting it up front with a 404 avoids a wasted DB round trip. Call it at the top of the handler, bail out with `if (!id) return;`, and reuse the returned `id` for the rest of the handler instead of re-reading `req.params.id`. Never inline a uuid check or skip this for a new `:id` route.
- **Webhooks live under `/api/webhooks`, never mixed into a resource's own router**: any server-to-server endpoint authenticated by a shared secret (via `requireWebhookSecret`) instead of a user session belongs in `server/src/routes/webhooks.ts`, mounted at `/api/webhooks`. Resource routers like `tickets.ts` stay exclusively session-authed (`requireAuth`) — don't add a `requireWebhookSecret`-only route to a session-authed router just because it operates on the same resource. Share Prisma `select` shapes between the two (e.g. `ticket-select.ts`) instead of duplicating them.
- **Route handlers are named functions, not inline callbacks**: define each handler as a `const handlerName: RequestHandler = async (req, res) => { ... }` above the router, then register all routes together at the bottom of the file (e.g. `router.get("/", requireAuth, requireAdmin, listUsers);`). Never pass an inline `async (req, res) => { ... }` directly to `router.get/post/patch/delete`.
- **Migrations under `server/prisma/migrations/` are immutable once committed**: never hand-edit or delete an already-committed migration's `migration.sql` — add a new migration on top instead. This is enforced by a local pre-commit hook (`.githooks/pre-commit` — run `git config core.hooksPath .githooks` once to enable it) and by the `migration-guard` GitHub Actions workflow (`.github/workflows/migration-guard.yml`), which blocks any PR or push to `master` that modifies or deletes an existing migration file.
- **Lint and all test suites must pass before pushing**: `.githooks/pre-push` runs root `bun run lint`, `bun run test:unit` (server unit and client component tests through Turbo), `bun run test:integration` (Playwright API tests in `e2e/api`), and `bun run test:e2e e2e/pages` (browser tests). It stops and blocks the push on the first failure. API and browser tests require `server/.env.test`, a migrated test database, and Playwright Chromium (`bunx playwright install chromium`). Playwright starts the local test services and seeds the test users. `bun run test:e2e` without a filter still runs the entire Playwright suite. The `client-quality-checks` workflow separately runs client lint and component tests on GitHub.

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
| `SENTRY_DSN` | server | Sentry error monitoring DSN — leave blank to disable (e.g. local dev/test) |
| `SENTRY_ENVIRONMENT` | server | Sentry environment tag (e.g. development, staging, production) — used to filter issues in Sentry |
| `VITE_SENTRY_DSN` | client | Sentry error monitoring DSN — leave blank to disable (e.g. local dev/test) |
| `VITE_SENTRY_ENVIRONMENT` | client | Sentry environment tag (e.g. development, staging, production) — used to filter issues in Sentry |

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

**When to use e2e vs component tests** — e2e tests require a real browser and a running server. Only write e2e tests for scenarios that genuinely need both:
- Auth redirects (unauthenticated/unauthorized access)
- Cross-page navigation flows
- Data persistence verified by a page reload
- Full-stack integration flows (e.g. webhook creates data → UI displays it)
- Full mutation round-trips that cross the network boundary (e.g. submitting a form and seeing the result persisted)

Never write e2e tests for: rendering, display logic, component states, API call verification, form validation, or error messages — use component tests for all of these.

## Shared code (`core/`)

The `core/` package (`@resolvane/core`) holds zod schemas that are used on **both** the client and server. It has no build step — both sides import TypeScript source through its package exports and Bun workspace links.

```
core/src/
├── schemas/
│   └── user.ts      # createUserSchema, CreateUserInput
└── index.ts         # re-exports everything
```

**Rules:**
- Any zod schema shared between client and server lives in `core/src/schemas/`.
- Import as `import { mySchema, type MyInput } from "@resolvane/core"` — never duplicate schemas in client or server.
- Both client and server declare `"@resolvane/core": "workspace:*"`. Run `bun install` from the repository root to create the workspace links. The package's `exports` field resolves to `core/src/index.ts`.
- `core` has no runtime dependencies — only `zod` as a peer dependency (already installed in both client and server).

## Documentation

Always use **context7** (`mcp__context7`) to fetch up-to-date docs before using any library. Do not rely on training data for API syntax or version-specific behavior. Resolve library ID first, then query docs.

Libraries in use: `express`, `react`, `react-router-dom`, `prisma`, `tailwindcss`, `@anthropic-ai/sdk`, `better-auth`, `cors`, `shadcn`, `lucide-react`, `react-hook-form`, `zod`.

## Resolvane brand palette

Use deep teal primary actions (`#0F766E` in light mode, `#5EEAD4` in dark mode), cool slate neutrals, and mint AI surfaces through the semantic tokens in `client/src/index.css`. Keep status and destructive colors semantic and distinct from branding. The favicon uses the light primary teal.
