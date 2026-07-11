import { and, eq, isNull } from "drizzle-orm";

import { createRefreshToken, hashToken } from "../auth/tokens.js";
import type { Database } from "../db/client.js";
import { noteShares, notes } from "../db/schema.js";

const DEFAULT_SHARE_EXPIRY_DAYS = 7;

function shareExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_SHARE_EXPIRY_DAYS);
  return expiresAt;
}

export async function createNoteShare(
  db: Database,
  userId: string,
  noteId: string,
): Promise<{ shareId: string; token: string; expiresAt: Date } | null> {
  const [note] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));

  if (!note) {
    return null;
  }

  const token = createRefreshToken();
  const expiresAt = shareExpiryDate();

  const [share] = await db
    .insert(noteShares)
    .values({
      noteId,
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    })
    .returning({ id: noteShares.id });

  return { shareId: share.id, token, expiresAt };
}

export async function revokeNoteShare(
  db: Database,
  userId: string,
  noteId: string,
  shareId: string,
): Promise<boolean> {
  const [share] = await db
    .update(noteShares)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(noteShares.id, shareId),
        eq(noteShares.noteId, noteId),
        eq(noteShares.userId, userId),
        isNull(noteShares.revokedAt),
      ),
    )
    .returning({ id: noteShares.id });

  return Boolean(share);
}

export async function getSharedNoteByToken(
  db: Database,
  token: string,
): Promise<
  { title: string; content: string; updatedAt: Date } | "invalid" | "expired" | "revoked"
> {
  const tokenHash = hashToken(token);
  const [share] = await db
    .select({
      revokedAt: noteShares.revokedAt,
      expiresAt: noteShares.expiresAt,
      title: notes.title,
      content: notes.content,
      updatedAt: notes.updatedAt,
    })
    .from(noteShares)
    .innerJoin(notes, eq(noteShares.noteId, notes.id))
    .where(eq(noteShares.tokenHash, tokenHash));

  if (!share) {
    return "invalid";
  }

  if (share.revokedAt) {
    return "revoked";
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return "expired";
  }

  return {
    title: share.title,
    content: share.content,
    updatedAt: share.updatedAt,
  };
}
