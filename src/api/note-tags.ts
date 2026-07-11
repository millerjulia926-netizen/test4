import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { noteTags, notes, tags } from "../db/schema.js";

export type NoteTagSummary = {
  id: string;
  name: string;
};

export async function getTagsForNote(db: Database, noteId: string): Promise<NoteTagSummary[]> {
  return db
    .select({ id: tags.id, name: tags.name })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(noteTags.noteId, noteId));
}

export async function tagsBelongToUser(
  db: Database,
  userId: string,
  tagIds: string[],
): Promise<boolean> {
  if (tagIds.length === 0) {
    return true;
  }

  const owned = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));

  return owned.length === tagIds.length;
}

export async function replaceNoteTags(
  db: Database,
  noteId: string,
  tagIds: string[],
): Promise<void> {
  await db.delete(noteTags).where(eq(noteTags.noteId, noteId));

  if (tagIds.length === 0) {
    return;
  }

  await db.insert(noteTags).values(tagIds.map((tagId) => ({ noteId, tagId })));
}

export async function noteBelongsToUser(
  db: Database,
  userId: string,
  noteId: string,
): Promise<boolean> {
  const [note] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));

  return Boolean(note);
}
