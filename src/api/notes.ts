import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";

import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import type { Database } from "../db/client.js";
import { folders, notes } from "../db/schema.js";

function parseNoteId(rawId: string | string[]): string | null {
  return typeof rawId === "string" ? rawId : null;
}

async function folderBelongsToUser(
  db: Database,
  userId: string,
  folderId: string,
): Promise<boolean> {
  const [folder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

  return Boolean(folder);
}

export function createNotesRouter(db: Database) {
  const router = Router();

  router.use(requireSession(db));

  router.get("/", async (req: AuthenticatedRequest, res) => {
    const userNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, req.userId!))
      .orderBy(desc(notes.updatedAt));

    res.json(userNotes);
  });

  router.post("/", async (req: AuthenticatedRequest, res) => {
    const { title, content, folderId } = req.body ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    if (folderId !== undefined && folderId !== null) {
      if (typeof folderId !== "string") {
        res.status(400).json({ error: "folderId must be a string or null" });
        return;
      }

      if (!(await folderBelongsToUser(db, req.userId!, folderId))) {
        res.status(400).json({ error: "Folder not found" });
        return;
      }
    }

    const [note] = await db
      .insert(notes)
      .values({
        userId: req.userId!,
        title: title.trim(),
        content: typeof content === "string" ? content : "",
        folderId: folderId ?? null,
      })
      .returning();

    res.status(201).json(note);
  });

  router.get("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = parseNoteId(req.params.id);
    if (!noteId) {
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

  router.patch("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = parseNoteId(req.params.id);
    if (!noteId) {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const { title, content, folderId } = req.body ?? {};
    const updates: Partial<typeof notes.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "Title must be a non-empty string" });
        return;
      }
      updates.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string") {
        res.status(400).json({ error: "Content must be a string" });
        return;
      }
      updates.content = content;
    }

    if (folderId !== undefined) {
      if (folderId !== null && typeof folderId !== "string") {
        res.status(400).json({ error: "folderId must be a string or null" });
        return;
      }

      if (folderId !== null && !(await folderBelongsToUser(db, req.userId!, folderId))) {
        res.status(400).json({ error: "Folder not found" });
        return;
      }

      updates.folderId = folderId;
    }

    if (Object.keys(updates).length === 1) {
      res.status(400).json({ error: "At least one field is required to update" });
      return;
    }

    const [note] = await db
      .update(notes)
      .set(updates)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)))
      .returning();

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(note);
  });

  router.delete("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = parseNoteId(req.params.id);
    if (!noteId) {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const [deleted] = await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)))
      .returning({ id: notes.id });

    if (!deleted) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.status(204).send();
  });

  return router;
}
