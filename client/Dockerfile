# syntax=docker/dockerfile:1
# Development only; production files are built in CI and hosted in S3.
FROM node:24.22.3-bookworm-slim AS development
WORKDIR /app
RUN npm install --global pnpm@10.34.9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json ./client/package.json
COPY core/package.json ./core/package.json
RUN --mount=type=cache,id=resolvane-client-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --store-dir /pnpm/store --frozen-lockfile \
    --filter resolvane --filter @resolvane/client...
COPY turbo.json tsconfig.json .node-version ./
COPY core/tsconfig.json ./core/tsconfig.json
COPY core/src ./core/src
COPY client ./client
RUN mkdir -p /app/core/dist /app/.turbo /app/core/.turbo /app/client/.turbo \
    && chown -R node:node /app/core/dist /app/.turbo /app/core/.turbo /app/client/.turbo \
    && chown node:node /app/client/node_modules
ENV NODE_ENV=development CONTAINER_DEV=true
USER node
EXPOSE 5173
CMD ["pnpm", "dev:client"]
