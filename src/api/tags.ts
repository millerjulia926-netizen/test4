import { and, eq } from "drizzle-orm";
import { Router } from "express";

import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import type { Database } from "../db/client.js";
import { tags } from "../db/schema.js";

function parseId(rawId: string | string[]): string | null {
  return typeof rawId === "string" ? rawId : null;
}

export function createTagsRouter(db: Database) {
  const router = Router();

  router.use(requireSession(db));

  router.get("/", async (req: AuthenticatedRequest, res) => {
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, req.userId!))
      .orderBy(tags.name);

    res.json(userTags);
  });

  router.post("/", async (req: AuthenticatedRequest, res) => {
    const { name } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    try {
      const [tag] = await db
        .insert(tags)
        .values({
          userId: req.userId!,
          name: name.trim(),
        })
        .returning();

      res.status(201).json(tag);
    } catch {
      res.status(409).json({ error: "A tag with this name already exists" });
    }
  });

  router.patch("/:id", async (req: AuthenticatedRequest, res) => {
    const tagId = parseId(req.params.id);
    if (!tagId) {
      res.status(400).json({ error: "Invalid tag id" });
      return;
    }

    const { name } = req.body ?? {};
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    try {
      const [tag] = await db
        .update(tags)
        .set({ name: name.trim() })
        .where(and(eq(tags.id, tagId), eq(tags.userId, req.userId!)))
        .returning();

      if (!tag) {
        res.status(404).json({ error: "Tag not found" });
        return;
      }

      res.json(tag);
    } catch {
      res.status(409).json({ error: "A tag with this name already exists" });
    }
  });

  router.delete("/:id", async (req: AuthenticatedRequest, res) => {
    const tagId = parseId(req.params.id);
    if (!tagId) {
      res.status(400).json({ error: "Invalid tag id" });
      return;
    }

    const [deleted] = await db
      .delete(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, req.userId!)))
      .returning({ id: tags.id });

    if (!deleted) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    res.status(204).send();
  });

  return router;
}
