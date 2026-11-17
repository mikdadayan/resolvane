# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f server/Dockerfile .
FROM node:24.22.3-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@10.34.9

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY core/package.json ./core/package.json
RUN --mount=type=cache,id=resolvane-pnpm-amd64,target=/pnpm/store,sharing=locked \
    pnpm install --store-dir /pnpm/store --frozen-lockfile

FROM dependencies AS source
COPY server/certs/rds-ca.pem ./server/certs/rds-ca.pem
COPY core/src ./core/src
COPY core/tsconfig.json ./core/tsconfig.json
COPY server/src ./server/src
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts server/tsconfig.json server/tsconfig.build.json server/knowledge-base.md ./server/
COPY server/scripts ./server/scripts
RUN DATABASE_URL=postgresql://unused:unused@localhost:5432/unused \
    pnpm --filter @resolvane/server exec prisma generate
FROM source AS development
COPY turbo.json tsconfig.json .node-version ./
RUN mkdir -p /app/core/dist /app/.turbo /app/core/.turbo /app/server/.turbo \
    && chown -R node:node /app/core/dist /app/.turbo /app/core/.turbo /app/server/.turbo
ENV NODE_ENV=development PORT=3000
USER node
EXPOSE 3000
CMD ["pnpm", "dev:server"]

FROM source AS build
RUN pnpm --filter @resolvane/core build \
    && pnpm --filter @resolvane/server build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY core/package.json ./core/package.json
RUN --mount=type=cache,id=resolvane-pnpm-amd64,target=/pnpm/store,sharing=locked \
    pnpm install --store-dir /pnpm/store --frozen-lockfile --prod --filter @resolvane/server...

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
COPY --chown=node:node server/certs/rds-ca.pem ./server/certs/rds-ca.pem
# Copy the complete pnpm store and package links, keeping their relative layout.
COPY --from=production-dependencies --chown=node:node /app/ /app/
COPY --from=build --chown=node:node /app/core/dist ./core/dist
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/server/prisma ./server/prisma
COPY --from=build --chown=node:node /app/server/prisma.config.ts ./server/prisma.config.ts
WORKDIR /app/server
USER node
EXPOSE 3000
ENTRYPOINT []
CMD ["node", "dist/index.js"]
