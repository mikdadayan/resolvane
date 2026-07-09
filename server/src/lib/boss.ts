import { PgBoss } from "pg-boss";

export const boss = new PgBoss(process.env.DATABASE_URL!);

// Registered once here rather than in each worker — pg-boss's "error" event is emitted on this
// shared instance, so registering it per-worker would log every error once per worker.
boss.on("error", (err) => console.error("[pg-boss]", err));
