import request from "supertest";
import { it, expect, vi } from "vitest";
import { app } from "../../src/app.js";
import { signToken, verifyToken } from "../../src/lib/token.js";
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

it("non-numeric id param returns 400 validation shape", async () => {
  const res = await request(app).get("/users/abc/profile");
  expect(res.status).toBe(400);
  expect(res.body.errors[0].field).toBe("userId");
});

it("signToken/verifyToken round-trip the id", () => {
  const fakeUser = { id: 7, username: "x", bio: null, createdAt: new Date(), photo: null };
  expect(verifyToken(signToken(fakeUser))).toMatchObject({ id: 7 });
});
