import { and, desc, eq, ilike, isNotNull, isNull, or, SQL } from "drizzle-orm";
import { Router } from "express";

import { getTagsForNote, replaceNoteTags, tagsBelongToUser } from "./note-tags.js";
import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import type { Database } from "../db/client.js";
import { folders, noteTags, notes, tags } from "../db/schema.js";

function parseNoteId(rawId: string | string[]): string | null {
  return typeof rawId === "string" ? rawId : null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
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

async function serializeNote(db: Database, note: typeof notes.$inferSelect) {
  const noteTagsList = await getTagsForNote(db, note.id);
  return { ...note, tags: noteTagsList };
}

function parseTagIds(value: unknown): string[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((tagId) => typeof tagId !== "string")) {
    return null;
  }

  return value;
}

export function createNotesRouter(db: Database) {
  const router = Router();

  router.use(requireSession(db));

  router.get("/", async (req: AuthenticatedRequest, res) => {
    const folderId = typeof req.query.folderId === "string" ? req.query.folderId : undefined;
    const tagId = typeof req.query.tagId === "string" ? req.query.tagId : undefined;
    const search =
      typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;
    const showArchived = req.query.archived === "true";

    const conditions: SQL[] = [eq(notes.userId, req.userId!)];

    if (showArchived) {
      conditions.push(isNotNull(notes.archivedAt));
    } else {
      conditions.push(isNull(notes.archivedAt));
    }

    if (folderId) {
      if (!(await folderBelongsToUser(db, req.userId!, folderId))) {
        res.status(400).json({ error: "Folder not found" });
        return;
      }
      conditions.push(eq(notes.folderId, folderId));
    }

    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      const searchCondition = or(ilike(notes.title, pattern), ilike(notes.content, pattern));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    let userNotes = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));

    if (tagId) {
      const [tag] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.userId, req.userId!)));

      if (!tag) {
        res.status(400).json({ error: "Tag not found" });
        return;
      }

      const taggedRows = await db
        .select({ noteId: noteTags.noteId })
        .from(noteTags)
        .where(eq(noteTags.tagId, tagId));

      const taggedIds = new Set(taggedRows.map((row) => row.noteId));
      userNotes = userNotes.filter((note) => taggedIds.has(note.id));
    }

    const payload = await Promise.all(userNotes.map((note) => serializeNote(db, note)));
    res.json(payload);
  });

  router.post("/", async (req: AuthenticatedRequest, res) => {
    const { title, content, folderId, tagIds } = req.body ?? {};
    const parsedTagIds = parseTagIds(tagIds);

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    if (parsedTagIds === null) {
      res.status(400).json({ error: "tagIds must be an array of strings" });
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

    if (parsedTagIds && !(await tagsBelongToUser(db, req.userId!, parsedTagIds))) {
      res.status(400).json({ error: "One or more tags were not found" });
      return;
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

    if (parsedTagIds) {
      await replaceNoteTags(db, note.id, parsedTagIds);
    }

    res.status(201).json(await serializeNote(db, note));
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

    res.json(await serializeNote(db, note));
  });

  router.patch("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = parseNoteId(req.params.id);
    if (!noteId) {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const { title, content, folderId, tagIds, isPinned, archived } = req.body ?? {};
    const parsedTagIds = parseTagIds(tagIds);
    const updates: Partial<typeof notes.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsedTagIds === null) {
      res.status(400).json({ error: "tagIds must be an array of strings" });
      return;
    }

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

    if (isPinned !== undefined) {
      if (typeof isPinned !== "boolean") {
        res.status(400).json({ error: "isPinned must be a boolean" });
        return;
      }
      updates.isPinned = isPinned;
    }

    if (archived !== undefined) {
      if (typeof archived !== "boolean") {
        res.status(400).json({ error: "archived must be a boolean" });
        return;
      }
      updates.archivedAt = archived ? new Date() : null;
      if (archived) {
        updates.isPinned = false;
      }
    }

    if (parsedTagIds && !(await tagsBelongToUser(db, req.userId!, parsedTagIds))) {
      res.status(400).json({ error: "One or more tags were not found" });
      return;
    }

    if (Object.keys(updates).length === 1 && parsedTagIds === undefined) {
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

    if (parsedTagIds !== undefined) {
      await replaceNoteTags(db, note.id, parsedTagIds);
    }

    res.json(await serializeNote(db, note));
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
