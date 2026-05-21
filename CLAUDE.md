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

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, React Router v7
- **Backend**: Bun, Express, TypeScript
- **Database**: PostgreSQL + Prisma
- **Auth**: express-session + connect-pg-simple (database sessions)
- **AI**: Anthropic Claude API
- **Email**: SendGrid or Mailgun

## Documentation

Always use **context7** (`mcp__context7`) to fetch up-to-date documentation before using any library or framework. Do not rely on training data for API syntax, configuration, or version-specific behavior.

```
# Example: resolve the library ID first, then fetch docs
mcp__context7__resolve-library-id → mcp__context7__query-docs
```

Libraries in use: `express`, `react`, `react-router-dom`, `prisma`, `tailwindcss`, `@anthropic-ai/sdk`, `express-session`, `connect-pg-simple`, `cors`.
