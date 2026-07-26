import "./instrument";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";
import { AppError, isTrackedInSentry } from "./lib/errors";
import { boss } from "./lib/boss";
import { startClassifyTicketWorker } from "./workers/classify-ticket-worker";
import { startAutoResolveTicketWorker } from "./workers/auto-resolve-ticket-worker";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import webhooksRouter from "./routes/webhooks";
import dashboardRouter from "./routes/dashboard";

const DATABASE_URL = process.env.DATABASE_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is required");
if (!BETTER_AUTH_URL) throw new Error("BETTER_AUTH_URL is required");
if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is required");
if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is required");
if (!RESEND_WEBHOOK_SECRET) throw new Error("RESEND_WEBHOOK_SECRET is required");
if (!RESEND_FROM_EMAIL) throw new Error("RESEND_FROM_EMAIL is required");

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

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  }),
);

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
app.use("/api/dashboard", dashboardRouter);

Sentry.setupExpressErrorHandler(app);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    if (process.env.NODE_ENV === "production" && isTrackedInSentry(err.code)) {
      Sentry.captureException(err, { level: "warning", tags: { errorCode: err.code } });
    }
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await boss.start();
    await startClassifyTicketWorker();
    await startAutoResolveTicketWorker();
    console.log("Job queue started");
  } catch (err) {
    console.error("Failed to start job queue:", err);
    Sentry.captureException(err);
    await Sentry.flush(2000);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
