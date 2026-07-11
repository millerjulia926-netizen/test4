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

describe.runIf(dbAvailable)("notes search API", () => {
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

  it("matches notes by title", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Meeting agenda", content: "Discuss budget" });

    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Groceries", content: "Milk and eggs" });

    const response = await request(app)
      .get("/notes?q=meeting")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe("Meeting agenda");
  });

  it("matches notes by content", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Trip", content: "Book flights to Tokyo" });

    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Errands", content: "Pick up dry cleaning" });

    const response = await request(app)
      .get("/notes?q=tokyo")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe("Trip");
  });

  it("returns an empty list when nothing matches", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ideas", content: "Brainstorm features" });

    const response = await request(app)
      .get("/notes?q=nonexistent")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("does not return another user's notes", async () => {
    const alice = await signupAndGetToken("alice@example.com");
    const bob = await signupAndGetToken("bob@example.com");

    await request(alice.app)
      .post("/notes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ title: "Secret project", content: "Confidential roadmap" });

    const response = await request(bob.app)
      .get("/notes?q=secret")
      .set("Authorization", `Bearer ${bob.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
