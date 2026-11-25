import request from "supertest";
import { it, expect, beforeEach } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetDb } from "../helpers/db.js";
import { makeUser, makeGroup } from "../helpers/factories.js";

beforeEach(resetDb);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

it("POST /groups DM twice returns 201 then 200 with the same id", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const post = () => request(app).post("/groups").set(auth(alice.token)).send({ memberIds: [bob.user.id], directMsg: true });
  const first = await post();
  const second = await post();
  expect([first.status, second.status]).toEqual([201, 200]);
  expect(second.body.id).toBe(first.body.id);
  expect(first.body.name).toBe("bob");
});

it("DM lookup matches the exact pair", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const carol = await makeUser("carol");
  const dm = (other: number) => request(app).post("/groups").set(auth(alice.token)).send({ memberIds: [other], directMsg: "true" });
  const a = await dm(bob.user.id);
  const b = await dm(carol.user.id);
  expect(b.status).toBe(201);
  expect(b.body.id).not.toBe(a.body.id);
});

it("POST /groups validates DMs and members", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const post = (body: object) => request(app).post("/groups").set(auth(alice.token)).send(body);
  expect((await post({ memberIds: [alice.user.id], directMsg: true })).status).toBe(400);
  expect((await post({ memberIds: [bob.user.id, 9999], directMsg: true })).status).toBe(400);
  expect((await post({ memberIds: [9999], directMsg: false })).status).toBe(404);
});

it("POST /groups creates a group with the caller as admin and a viewer-specific default name (multipart string booleans)", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const res = await request(app).post("/groups").set(auth(alice.token))
    .field("memberIds", JSON.stringify([bob.user.id, bob.user.id])).field("directMsg", "false");
  expect(res.status).toBe(201);
  expect(res.body.members).toHaveLength(2);
  expect(res.body.name).toBe("bob");
  const g = await prisma.group.findUniqueOrThrow({ where: { id: res.body.id }, include: { admins: true } });
  expect(g.admins.map((a) => a.id)).toEqual([alice.user.id]);
});

it("GET /groups lists the caller's chats named for the caller", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  await makeUser("carol");
  await prisma.group.create({ data: { directMsg: true, members: { connect: [{ id: alice.user.id }, { id: bob.user.id }] } } });
  const res = await request(app).get("/groups").set(auth(alice.token));
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0]).toMatchObject({ name: "bob", messages: [] });
  expect(res.body[0].members[0]).not.toHaveProperty("password");
});

it("an unnamed group is named per viewer, excluding the viewer", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const carol = await makeUser("carol");
  await request(app).post("/groups").set(auth(alice.token)).send({ memberIds: [bob.user.id, carol.user.id], directMsg: false });
  const res = await request(app).get("/groups").set(auth(bob.token));
  expect(res.body[0].name).toBe("alice & carol");
});

it("GET /groups/:id as a non-member returns 403, as a member the profile, missing 404", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const g = await makeGroup({ members: [alice.user.id], admins: [alice.user.id] });
  expect((await request(app).get(`/groups/${g.id}`).set(auth(bob.token))).status).toBe(403);
  const ok = await request(app).get(`/groups/${g.id}`).set(auth(alice.token));
  expect(ok.status).toBe(200);
  expect(ok.body).toMatchObject({ admins: [{ id: alice.user.id }], createdAtDate: expect.any(String) });
  expect((await request(app).get("/groups/9999").set(auth(alice.token))).status).toBe(404);
});

it("PUT /groups/:id is admin only", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const g = await makeGroup({ members: [alice.user.id, bob.user.id], admins: [alice.user.id] });
  expect((await request(app).put(`/groups/${g.id}`).set(auth(bob.token)).field("name", "x")).status).toBe(403);
  const ok = await request(app).put(`/groups/${g.id}`).set(auth(alice.token)).field("name", " new ");
  expect(ok.status).toBe(200);
  expect(ok.body.name).toBe("new");
});

it("DELETE /groups/:id as a non-admin member returns 403; as admin returns 204 and its messages are gone", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const g = await makeGroup({ members: [alice.user.id, bob.user.id], admins: [alice.user.id] });
  await prisma.message.create({ data: { content: "hi", groupId: g.id, authorId: bob.user.id } });
  expect((await request(app).delete(`/groups/${g.id}`).set(auth(bob.token))).status).toBe(403);
  expect((await request(app).delete(`/groups/${g.id}`).set(auth(alice.token))).status).toBe(204);
  expect(await prisma.message.count({ where: { groupId: g.id } })).toBe(0);
  expect(await prisma.group.count({ where: { id: g.id } })).toBe(0);
  expect((await request(app).delete(`/groups/${g.id}`).set(auth(alice.token))).status).toBe(404);
});

it("DM lookup ignores a legacy 3-member directMsg chat containing the pair", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const carol = await makeUser("carol");
  const legacy = await makeGroup({ members: [alice.user.id, bob.user.id, carol.user.id], directMsg: true });
  const res = await request(app).post("/groups").set(auth(alice.token)).send({ memberIds: [bob.user.id], directMsg: true });
  expect(res.status).toBe(201);
  expect(res.body.id).not.toBe(legacy.id);
});

it("PUT /groups/:id rejects a blank name", async () => {
  const alice = await makeUser("alice");
  const g = await makeGroup({ members: [alice.user.id], admins: [alice.user.id] });
  expect((await request(app).put(`/groups/${g.id}`).set(auth(alice.token)).field("name", "  ")).status).toBe(400);
});

it("POST /groups rejects a chat with no other member", async () => {
  const alice = await makeUser("alice");
  const res = await request(app).post("/groups").set(auth(alice.token)).send({ memberIds: [alice.user.id], directMsg: false });
  expect(res.status).toBe(400);
  expect(res.body.message).toBe("A chat needs at least one other member.");
});

it("POST /groups concurrent identical DMs create one chat", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const post = () => request(app).post("/groups").set(auth(alice.token)).send({ memberIds: [bob.user.id], directMsg: true });
  const [a, b] = await Promise.all([post(), post()]);
  expect([a.status, b.status].sort()).toEqual([200, 201]);
  expect(a.body.id).toBe(b.body.id);
  expect(await prisma.group.count()).toBe(1);
});
