import request from "supertest";
import { it, expect, beforeEach } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetDb } from "../helpers/db.js";
import { makeUser } from "../helpers/factories.js";

beforeEach(resetDb);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

it("GET /users without a token returns 401", async () => {
  expect((await request(app).get("/users")).status).toBe(401);
});

it("GET /users applies the default photo", async () => {
  const { token } = await makeUser("alice");
  const res = await request(app).get("/users").set(auth(token));
  expect(res.status).toBe(200);
  expect(res.body[0].photo).toEqual(expect.any(String));
  expect(res.body[0]).not.toHaveProperty("password");
});

it("GET /users/:id returns the profile with contacts, 404 when missing", async () => {
  const { user, token } = await makeUser("alice");
  const res = await request(app).get(`/users/${user.id}`).set(auth(token));
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ username: "alice", contacts: [], createdAtDate: expect.any(String) });
  expect((await request(app).get("/users/9999").set(auth(token))).status).toBe(404);
});

it("PUT /users/:id updates own bio and returns 409 for a taken username", async () => {
  const { user, token } = await makeUser("alice");
  await makeUser("bob");
  const ok = await request(app).put(`/users/${user.id}`).set(auth(token)).field("bio", " hi ");
  expect(ok.status).toBe(200);
  expect(ok.body.bio).toBe("hi");
  const taken = await request(app).put(`/users/${user.id}`).set(auth(token)).field("username", "bob");
  expect(taken.status).toBe(409);
});

it("PUT /users/:id for another user returns 403", async () => {
  const { token } = await makeUser("alice");
  const { user: bob } = await makeUser("bob");
  const res = await request(app).put(`/users/${bob.id}`).set(auth(token)).field("bio", "x");
  expect(res.status).toBe(403);
  expect(res.body).toEqual({ message: "You can only change your own account." });
});

it("DELETE /users/:id for another user returns 403 and the user still exists", async () => {
  const { token } = await makeUser("alice");
  const { user: bob } = await makeUser("bob");
  expect((await request(app).delete(`/users/${bob.id}`).set(auth(token))).status).toBe(403);
  expect(await prisma.user.findUnique({ where: { id: bob.id } })).not.toBeNull();
});

it("DELETE /users/:id deletes self with 204", async () => {
  const { user, token } = await makeUser("alice");
  const res = await request(app).delete(`/users/${user.id}`).set(auth(token));
  expect(res.status).toBe(204);
  expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
});

it("PUT /users/:id/contacts adds contacts and keeps earlier ones", async () => {
  const { user, token } = await makeUser("alice");
  const { user: bob } = await makeUser("bob");
  const { user: cy } = await makeUser("cy");
  const put = (ids: number[]) =>
    request(app).put(`/users/${user.id}/contacts`).set(auth(token)).send({ contactIds: ids });
  await put([bob.id]);
  const res = await put([cy.id]);
  expect(res.status).toBe(200);
  expect(res.body.contacts.map((c: { id: number }) => c.id).sort()).toEqual([bob.id, cy.id]);
  expect(res.body).not.toHaveProperty("contactedBy");
});

it("PUT /users/:id/contacts for another user returns 403", async () => {
  const { token } = await makeUser("alice");
  const { user: bob } = await makeUser("bob");
  const res = await request(app).put(`/users/${bob.id}/contacts`).set(auth(token)).send({ contactIds: [] });
  expect(res.status).toBe(403);
});

it("PUT /users/:id with a photo for another user returns 403 before any upload", async () => {
  const { token } = await makeUser("alice");
  const { user: bob } = await makeUser("bob");
  const res = await request(app)
    .put(`/users/${bob.id}`)
    .set(auth(token))
    .attach("photo", Buffer.from("x"), "x.png");
  expect(res.status).toBe(403);
});
