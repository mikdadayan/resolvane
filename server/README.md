# Backend

## Default local runtime

Start Docker Desktop and your local PostgreSQL server. Copy `server/.env.example`
to `server/.env.docker` and replace the placeholders. In `DATABASE_URL`, use
`host.docker.internal` instead of `localhost` to reach PostgreSQL on your Mac.
Keep `BETTER_AUTH_URL=http://localhost:3000` and allow
`BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173`. Set `SENTRY_DSN=` for local use.
Compose accepts the quoted values in the example. The Docker environment file is
ignored by Git and excluded from image builds.

Ensure `client/.env` contains `VITE_SERVER_BASE_URL=http://localhost:3000`.
Stop any existing backend using port 3000 before starting Compose.

From the repository root:

```sh
# First run, and after adding database migrations:
pnpm backend:migrate

# Build/start the backend container, wait for health, then start local Vite:
pnpm dev

# Follow backend logs:
pnpm dev:logs

# Stop the backend after stopping Vite with Ctrl+C:
pnpm dev:stop
```

Open http://localhost:5173. PostgreSQL and the client run on the host; only the
backend runs in Docker, using development dependencies and TypeScript watchers.
Existing database users remain available; migrations do not seed an admin.
The development image skips production compilation. It generates Prisma during
the image build, then builds core at startup before launching the watchers.
The server runs TypeScript directly through tsx. Developers do not need to type
Docker or Compose commands; the pnpm scripts select the correct configuration.

Server and core source are bind-mounted read-only. Server edits restart tsx;
core edits rebuild core and then restart the server. Dependencies and generated
Prisma code stay inside Docker, separate from your Mac's installation. After
dependency, Prisma schema, configuration, or Dockerfile changes, run
`pnpm backend:up` to rebuild and replace the container. Client changes use Vite
hot reload. `pnpm backend:logs` follows backend
logs. Ctrl+C stops Vite; use `pnpm backend:down` to stop the backend too.

Use `pnpm dev:local` to run both apps directly on the host instead.

`compose.yaml` defines the production-style runtime; `compose.dev.yaml` overrides
the build target and adds source mounts for local development. `pnpm dev` and
`pnpm backend:up` combine both files. Use `pnpm backend:prod` to replace the dev
container with the compiled production runtime (no source mounts or hot reload).
Both modes use port 3000, so run one at a time. Migration commands use the
production image and remain explicit; they do not run automatically on startup.

## Host backend development

Use Node 24.22.3 and pnpm 10.34.9. Install from the repository root with `pnpm install --frozen-lockfile`.

Run `pnpm dev:server` from the root for development. It builds the shared core package and watches both packages.
Local development loads `server/.env`. Run `pnpm --filter @resolvane/server exec prisma generate` before the first build.

`pnpm build` compiles core, the server, and the frontend. The backend starts with `pnpm --filter @resolvane/server start`.
Production uses compiled JavaScript and environment variables supplied by its host. No Bun or tsx runtime is needed.
The Docker build uses `server/Dockerfile` with the repository root as context.
