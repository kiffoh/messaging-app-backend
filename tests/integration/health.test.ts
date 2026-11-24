import request from "supertest";
import { it, expect, vi } from "vitest";
import { app } from "../../src/app.js";
import { signToken, verifyToken } from "../../src/lib/token.js";
import { handleError } from "../../src/middleware/error.js";
import { resetDb } from "../helpers/db.js";
import { makeUser } from "../helpers/factories.js";

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
  await resetDb();
  const { token } = await makeUser();
  const res = await request(app).get("/users/abc").set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(400);
  expect(res.body.errors[0].field).toBe("userId");
});

it("an id beyond the 32-bit range returns 400, not 500", async () => {
  await resetDb();
  const { token } = await makeUser();
  const res = await request(app).get("/groups/99999999999").set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(400);
});

it("error handler maps a 4xx http_code (Cloudinary) to that status", () => {
  const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
  handleError({ http_code: 400, message: "Invalid image file" }, {} as never, res as never, vi.fn());
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ message: "Invalid image file" });
});

it("signToken/verifyToken round-trip the id", () => {
  const fakeUser = { id: 7, username: "x", bio: null, createdAt: new Date(), photo: null };
  expect(verifyToken(signToken(fakeUser))).toMatchObject({ id: 7 });
});
