import { drizzle } from "drizzle-orm/node-postgres";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { createDbPool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import * as schema from "../db/schema.js";
import { getTestDatabaseUrl, isDatabaseAvailable, resetDatabase } from "../db/test-helpers.js";

const databaseUrl = getTestDatabaseUrl();
const dbAvailable = await isDatabaseAvailable(databaseUrl);

describe.runIf(dbAvailable)("folders and tags API", () => {
  const pool = createDbPool(databaseUrl);
  const db = drizzle(pool, { schema });

  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterAll(async () => {
    await pool.end();
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await resetDatabase(databaseUrl);
    await runMigrations(databaseUrl);
  });

  async function signupAndGetToken(email: string) {
    const app = createApp({ db });
    const response = await request(app).post("/auth/signup").send({ email, password: "Password1" });

    return { app, token: response.body.accessToken as string };
  }

  it("manages folders and filters notes by folder", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const folder = await request(app)
      .post("/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Work" });

    expect(folder.status).toBe(201);

    const note = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Standup", content: "Updates", folderId: folder.body.id });

    expect(note.status).toBe(201);
    expect(note.body.folderId).toBe(folder.body.id);

    const filtered = await request(app)
      .get(`/notes?folderId=${folder.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].id).toBe(note.body.id);
  });

  it("manages tags and assigns them on create and update", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const tag = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "important" });

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Priority", content: "Do this", tagIds: [tag.body.id] });

    expect(created.status).toBe(201);
    expect(created.body.tags).toEqual([{ id: tag.body.id, name: "important" }]);

    const tagTwo = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "follow-up" });

    const updated = await request(app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tagIds: [tagTwo.body.id] });

    expect(updated.body.tags).toEqual([{ id: tagTwo.body.id, name: "follow-up" }]);

    const filtered = await request(app)
      .get(`/notes?tagId=${tagTwo.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(filtered.body).toHaveLength(1);
  });

  it("rejects cross-user folder and tag access", async () => {
    const alice = await signupAndGetToken("alice@example.com");
    const bob = await signupAndGetToken("bob@example.com");

    const aliceFolder = await request(alice.app)
      .post("/folders")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ name: "Private" });
    const aliceTag = await request(alice.app)
      .post("/tags")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ name: "secret" });

    const bobNote = await request(bob.app)
      .post("/notes")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({
        title: "Hack",
        folderId: aliceFolder.body.id,
        tagIds: [aliceTag.body.id],
      });

    expect(bobNote.status).toBe(400);
  });

  it("lists and deletes folders and tags", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const folder = await request(app)
      .post("/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Archive" });
    const tag = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "old" });

    const foldersList = await request(app).get("/folders").set("Authorization", `Bearer ${token}`);
    const tagsList = await request(app).get("/tags").set("Authorization", `Bearer ${token}`);

    expect(foldersList.body).toHaveLength(1);
    expect(tagsList.body).toHaveLength(1);

    await request(app)
      .delete(`/folders/${folder.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await request(app)
      .delete(`/tags/${tag.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });
});
