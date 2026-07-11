import { Router } from "express";

import { getSharedNoteByToken } from "./note-shares.js";
import type { Database } from "../db/client.js";

export function createSharedRouter(db: Database) {
  const router = Router();

  router.get("/:token", async (req, res) => {
    const token = typeof req.params.token === "string" ? req.params.token : null;
    if (!token) {
      res.status(400).json({ error: "Invalid share token" });
      return;
    }

    const result = await getSharedNoteByToken(db, token);

    if (result === "invalid") {
      res.status(404).json({ error: "Share link not found" });
      return;
    }

    if (result === "revoked") {
      res.status(410).json({ error: "Share link has been revoked" });
      return;
    }

    if (result === "expired") {
      res.status(410).json({ error: "Share link has expired" });
      return;
    }

    res.json({
      title: result.title,
      content: result.content,
      updatedAt: result.updatedAt.toISOString(),
    });
  });

  return router;
}
