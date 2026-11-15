# Backend

Use Node 24.22.3 and pnpm 10.34.9. Install from the repository root with `pnpm install --frozen-lockfile`.

Run `pnpm dev:server` from the root for development. It builds the shared core package and watches both packages.
Local development loads `server/.env`. Run `pnpm --filter @resolvane/server exec prisma generate` before the first build.

`pnpm build` compiles core, the server, and the frontend. The backend starts with `pnpm --filter @resolvane/server start`.
Production uses compiled JavaScript and environment variables supplied by its host. No Bun or tsx runtime is needed.
The Docker build uses `server/Dockerfile` with the repository root as context.
