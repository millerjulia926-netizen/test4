import express from "express";

import { createAuthRouter } from "./api/auth.js";
import { createNotesRouter } from "./api/notes.js";
import { env } from "./config/env.js";
import { createDb, type Database } from "./db/client.js";

export type CreateAppOptions = {
  db?: Database;
};

export function createApp(options: CreateAppOptions = {}) {
  const db = options.db ?? createDb();
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "notes-app",
      environment: env.nodeEnv,
    });
  });

  app.use("/auth", createAuthRouter(db));
  app.use("/notes", createNotesRouter(db));

  return app;
}
