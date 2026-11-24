import request from "supertest";
import { it, expect, vi } from "vitest";
import { app } from "../../src/app.js";
import { resetDb } from "../helpers/db.js";

it("unknown route returns 404 json", async () => {
  const res = await request(app).get("/nope");
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ message: "Not Found" });
});

it("resetDb refuses the dev database", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://x@localhost:5432/messaging_app");
  await expect(resetDb()).rejects.toThrow("Refusing");
});
