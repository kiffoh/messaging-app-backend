import jwt from "jsonwebtoken";
import request from "supertest";
import { it, expect, beforeEach } from "vitest";
import { app } from "../../src/app.js";
import { verifyToken } from "../../src/lib/token.js";
import { resetDb } from "../helpers/db.js";
import { makeUser } from "../helpers/factories.js";

beforeEach(resetDb);

const signup = (username: string, password = "password") =>
  request(app).post("/auth/signup").send({ username, password });

it("signup returns 201 with token and a user without password", async () => {
  const res = await signup("alice");
  expect(res.status).toBe(201);
  expect(typeof res.body.token).toBe("string");
  expect(res.body.user.username).toBe("alice");
  expect(res.body.user).not.toHaveProperty("password");
});

it("signup with a taken username returns 409", async () => {
  await signup("alice");
  expect((await signup("alice")).status).toBe(409);
});

it("signup with an 11-char username returns 400 with field errors", async () => {
  const res = await signup("a".repeat(11));
  expect(res.status).toBe(400);
  expect(res.body.errors).toContainEqual(expect.objectContaining({ field: "username" }));
});

it("login returns 200 with token and a user without password", async () => {
  await makeUser("alice");
  const res = await request(app).post("/auth/login").send({ username: "alice", password: "password" });
  expect(res.status).toBe(200);
  expect(verifyToken(res.body.token)).toMatchObject({ id: res.body.user.id });
  expect(res.body.user).not.toHaveProperty("password");
});

it("login trims the username", async () => {
  await makeUser("alice");
  const res = await request(app).post("/auth/login").send({ username: "alice ", password: "password" });
  expect(res.body.user?.username).toBe("alice");
});

it("login with the wrong password returns 401", async () => {
  await makeUser("alice");
  const res = await request(app).post("/auth/login").send({ username: "alice", password: "nope" });
  expect(res.status).toBe(401);
  expect(res.body).toEqual({ message: "Invalid username or password." });
});

it("login with an unknown user returns the same 401", async () => {
  const res = await request(app).post("/auth/login").send({ username: "ghost", password: "password" });
  expect(res.status).toBe(401);
  expect(res.body).toEqual({ message: "Invalid username or password." });
});

it("a token signed with another secret is rejected", async () => {
  const res = await request(app).get("/groups").set("Authorization", `Bearer ${jwt.sign({ id: 1 }, "other")}`);
  expect(res.status).toBe(401);
});

it("verifyToken rejects garbage with a 401", () => {
  expect(() => verifyToken("garbage")).toThrow(expect.objectContaining({ status: 401 }));
});
