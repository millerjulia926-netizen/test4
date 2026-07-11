import { and, eq } from "drizzle-orm";
import { Router } from "express";

import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import type { Database } from "../db/client.js";
import { folders } from "../db/schema.js";

function parseId(rawId: string | string[]): string | null {
  return typeof rawId === "string" ? rawId : null;
}

export function createFoldersRouter(db: Database) {
  const router = Router();

  router.use(requireSession(db));

  router.get("/", async (req: AuthenticatedRequest, res) => {
    const userFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, req.userId!))
      .orderBy(folders.name);

    res.json(userFolders);
  });

  router.post("/", async (req: AuthenticatedRequest, res) => {
    const { name, parentId } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (parentId !== undefined && parentId !== null && typeof parentId !== "string") {
      res.status(400).json({ error: "parentId must be a string or null" });
      return;
    }

    if (parentId) {
      const [parent] = await db
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, parentId), eq(folders.userId, req.userId!)));

      if (!parent) {
        res.status(400).json({ error: "Parent folder not found" });
        return;
      }
    }

    try {
      const [folder] = await db
        .insert(folders)
        .values({
          userId: req.userId!,
          name: name.trim(),
          parentId: parentId ?? null,
        })
        .returning();

      res.status(201).json(folder);
    } catch {
      res.status(409).json({ error: "A folder with this name already exists here" });
    }
  });

  router.patch("/:id", async (req: AuthenticatedRequest, res) => {
    const folderId = parseId(req.params.id);
    if (!folderId) {
      res.status(400).json({ error: "Invalid folder id" });
      return;
    }

    const { name, parentId } = req.body ?? {};
    const updates: Partial<typeof folders.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "Name must be a non-empty string" });
        return;
      }
      updates.name = name.trim();
    }

    if (parentId !== undefined) {
      if (parentId !== null && typeof parentId !== "string") {
        res.status(400).json({ error: "parentId must be a string or null" });
        return;
      }

      if (parentId === folderId) {
        res.status(400).json({ error: "A folder cannot be its own parent" });
        return;
      }

      if (parentId) {
        const [parent] = await db
          .select({ id: folders.id })
          .from(folders)
          .where(and(eq(folders.id, parentId), eq(folders.userId, req.userId!)));

        if (!parent) {
          res.status(400).json({ error: "Parent folder not found" });
          return;
        }
      }

      updates.parentId = parentId;
    }

    if (Object.keys(updates).length === 1) {
      res.status(400).json({ error: "At least one field is required to update" });
      return;
    }

    try {
      const [folder] = await db
        .update(folders)
        .set(updates)
        .where(and(eq(folders.id, folderId), eq(folders.userId, req.userId!)))
        .returning();

      if (!folder) {
        res.status(404).json({ error: "Folder not found" });
        return;
      }

      res.json(folder);
    } catch {
      res.status(409).json({ error: "A folder with this name already exists here" });
    }
  });

  router.delete("/:id", async (req: AuthenticatedRequest, res) => {
    const folderId = parseId(req.params.id);
    if (!folderId) {
      res.status(400).json({ error: "Invalid folder id" });
      return;
    }

    const [deleted] = await db
      .delete(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, req.userId!)))
      .returning({ id: folders.id });

    if (!deleted) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    res.status(204).send();
  });

  return router;
}
