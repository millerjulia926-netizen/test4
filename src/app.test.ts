import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("notes app smoke test", () => {
  it("responds to health check", async () => {
    const app = createApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "notes-app",
    });
  });
});
