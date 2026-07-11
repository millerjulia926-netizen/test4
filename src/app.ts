import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAuthRouter } from "./api/auth.js";
import { createFoldersRouter } from "./api/folders.js";
import { createNotesRouter } from "./api/notes.js";
import { createSharedRouter } from "./api/shares.js";
import { createTagsRouter } from "./api/tags.js";
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
  app.use("/folders", createFoldersRouter(db));
  app.use("/tags", createTagsRouter(db));
  app.use("/notes", createNotesRouter(db));
  app.use("/shared", createSharedRouter(db));

  const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");
  app.use(express.static(clientDist));

  app.get("/{*splat}", (_req, res, next) => {
    if (
      _req.path.startsWith("/auth") ||
      _req.path.startsWith("/notes") ||
      _req.path.startsWith("/folders") ||
      _req.path.startsWith("/tags") ||
      _req.path.startsWith("/shared") ||
      _req.path === "/health"
    ) {
      next();
      return;
    }

    res.sendFile(path.join(clientDist, "index.html"), (error) => {
      if (error) {
        next();
      }
    });
  });

  return app;
}
