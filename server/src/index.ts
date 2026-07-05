import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";
import { boss } from "./lib/boss";
import { startClassifyTicketWorker } from "./workers/classify-ticket-worker";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import webhooksRouter from "./routes/webhooks";

const DATABASE_URL = process.env.DATABASE_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const INBOUND_WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is required");
if (!BETTER_AUTH_URL) throw new Error("BETTER_AUTH_URL is required");
if (!INBOUND_WEBHOOK_SECRET) throw new Error("INBOUND_WEBHOOK_SECRET is required");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/, credentials: true }));

if (process.env.NODE_ENV === "production") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/api/auth/sign-in", authLimiter);
}

// Must be before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  const { id, name, email, role, createdAt } = req.user!;
  res.json({ user: { id, name, email, role, createdAt } });
});

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/webhooks", webhooksRouter);

async function start() {
  try {
    await boss.start();
    await startClassifyTicketWorker();
    console.log("Job queue started");
  } catch (err) {
    console.error("Failed to start job queue:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
