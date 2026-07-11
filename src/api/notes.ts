import { and, eq } from "drizzle-orm";
import { Router } from "express";

import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import type { Database } from "../db/client.js";
import { notes } from "../db/schema.js";

export function createNotesRouter(db: Database) {
  const router = Router();

  router.use(requireSession(db));

  router.get("/", async (req: AuthenticatedRequest, res) => {
    const userNotes = await db.select().from(notes).where(eq(notes.userId, req.userId!));
    res.json(userNotes);
  });

  router.post("/", async (req: AuthenticatedRequest, res) => {
    const { title, content } = req.body ?? {};

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const [note] = await db
      .insert(notes)
      .values({
        userId: req.userId!,
        title,
        content: content ?? "",
      })
      .returning();

    res.status(201).json(note);
  });

  router.get("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = req.params.id;
    if (typeof noteId !== "string") {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)));

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(note);
  });

  return router;
}
