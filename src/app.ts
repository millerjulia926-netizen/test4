import express from "express";

import { env } from "./config/env.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "notes-app",
      environment: env.nodeEnv,
    });
  });

  return app;
}
