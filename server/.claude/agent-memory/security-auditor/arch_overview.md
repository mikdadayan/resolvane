---
name: arch-overview
description: Auth stack, route map, CORS config, and security posture snapshot as of first audit (2026-05-30)
metadata:
  type: project
---

## Stack
- Server: Bun + Express, port 3000, `server/src/index.ts`
- Client: React + Vite, port 5173, `client/src/`
- Auth: better-auth 1.x with Prisma adapter (PostgreSQL)
- ORM: Prisma 7 with adapter-pg (no DATABASE_URL in schema — passed at runtime via PrismaPg adapter)

## Auth Configuration (`server/src/lib/auth.ts`)
- `disableSignUp: true` — correct, no self-registration
- `input: false` on the `role` field — role is not settable via client-supplied auth payload
- `trustedOrigins` hardcodes localhost:5173 and localhost:5174, plus env var list

## Middleware
- `requireAuth` middleware (`server/src/middleware/require-auth.ts`): calls `auth.api.getSession()`, sets `req.user` and `req.session`, returns 401 if no session
- `req.user` and `req.session` typed as optional in `express.d.ts` — callers must guard against undefined
- No `requireAdmin` / `requireRole` middleware exists

## Routes (as of audit)
- GET /health — public
- GET /api/me — requireAuth protected
- /api/auth/* — better-auth handler

## CORS
- `cors({ origin: /^http:\/\/localhost(:\d+)?$/, credentials: true })` — matches ANY localhost port

## Key Security Issues Found
1. Real BETTER_AUTH_SECRET in server/.env (must verify not committed to git)
2. Weak seed credentials: admin@example.com / password123
3. No rate limiting on /api/auth/sign-in
4. Admin enforcement is client-side only (AdminRoute component)
5. /api/me returns full session object including token
6. No security headers (helmet not installed)
7. CORS allows any localhost port
8. req.user typed as optional — downstream handlers could panic if accessed without guard
