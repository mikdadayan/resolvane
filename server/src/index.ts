import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";
import usersRouter from "./routes/users";

const DATABASE_URL = process.env.DATABASE_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is required");
if (!BETTER_AUTH_URL) throw new Error("BETTER_AUTH_URL is required");

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
