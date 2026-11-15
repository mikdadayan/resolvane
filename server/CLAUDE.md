# Backend execution

Follow the repository-root CLAUDE.md. The backend uses Express with Node.js 24 LTS and pnpm.
Use tsx only for development and source seed scripts; production runs compiled ESM JavaScript.
Use standard Node APIs and Vitest for backend tests. Relative TypeScript imports use .js specifiers for Node ESM.
Do not edit generated Prisma files; configure the generator and regenerate them.
