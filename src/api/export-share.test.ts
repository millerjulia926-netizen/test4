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

describe.runIf(dbAvailable)("note export and sharing API", () => {
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

  it("exports a note as markdown for the owner", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Launch plan", content: "## Tasks\n\nShip export" });

    const exported = await request(app)
      .get(`/notes/${created.body.id}/export`)
      .set("Authorization", `Bearer ${token}`);

    expect(exported.status).toBe(200);
    expect(exported.headers["content-type"]).toMatch(/text\/markdown/);
    expect(exported.text).toContain("# Launch plan");
    expect(exported.text).toContain("Ship export");
  });

  it("creates and resolves a public share link", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Shared note", content: "Read-only body" });

    const share = await request(app)
      .post(`/notes/${created.body.id}/share`)
      .set("Authorization", `Bearer ${token}`);

    expect(share.status).toBe(201);
    expect(share.body.token).toBeTypeOf("string");

    const publicView = await request(app).get(`/shared/${share.body.token}`);
    expect(publicView.status).toBe(200);
    expect(publicView.body.title).toBe("Shared note");
    expect(publicView.body.content).toBe("Read-only body");
  });

  it("rejects share management from non-owners", async () => {
    const alice = await signupAndGetToken("alice@example.com");
    const bob = await signupAndGetToken("bob@example.com");

    const created = await request(alice.app)
      .post("/notes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ title: "Private", content: "Secret" });

    const denied = await request(bob.app)
      .post(`/notes/${created.body.id}/share`)
      .set("Authorization", `Bearer ${bob.token}`);

    expect(denied.status).toBe(404);
  });

  it("rejects revoked and invalid share links", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Temporary", content: "Expires soon" });

    const share = await request(app)
      .post(`/notes/${created.body.id}/share`)
      .set("Authorization", `Bearer ${token}`);

    const revoked = await request(app)
      .delete(`/notes/${created.body.id}/share/${share.body.shareId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(revoked.status).toBe(204);

    const publicView = await request(app).get(`/shared/${share.body.token}`);
    expect(publicView.status).toBe(410);
    expect(publicView.body.error).toMatch(/revoked/i);

    const missing = await request(app).get("/shared/not-a-real-token");
    expect(missing.status).toBe(404);
  });
});
