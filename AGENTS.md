# Resolvane — Agent Context

Read `CLAUDE.md` before working in this repository. It is the shared source of project architecture, conventions, and verification requirements. Also read applicable nested `CLAUDE.md` files when working in their directories; preserve the existing React/Vite and Bun/Express architecture when generic guidance conflicts with the implementation.

Reusable skills live in `.agents/skills/`. Claude already links to these same skills from `.claude/skills/`; do not duplicate them. Consult relevant skill instructions when needed. Claude-specific settings and agent memory remain in `.claude/`.
