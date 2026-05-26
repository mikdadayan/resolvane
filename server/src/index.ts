import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/, credentials: true }));

// Must be before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user, session: req.session });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
