import request from "supertest";
import { it, expect, beforeEach, vi } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetDb } from "../helpers/db.js";
import { makeUser, makeGroup } from "../helpers/factories.js";

beforeEach(resetDb);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function setup() {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const carol = await makeUser("carol");
  const group = await makeGroup({ members: [alice.user.id, bob.user.id] });
  return { alice, bob, carol, group };
}

it("POST /groups/:id/messages as a non-member returns 403", async () => {
  const { carol, group } = await setup();
  const res = await request(app).post(`/groups/${group.id}/messages`).set(auth(carol.token)).send({ content: "hi" });
  expect(res.status).toBe(403);
});

it("POST with neither content nor photo returns 400", async () => {
  const { alice, group } = await setup();
  const res = await request(app).post(`/groups/${group.id}/messages`).set(auth(alice.token)).send({ content: "   " });
  expect(res.status).toBe(400);
  expect(res.body.message).toBe("A message needs text or a photo.");
});

it("POST creates a message and bumps the group's updatedAt", async () => {
  const { alice, group } = await setup();
  const res = await request(app).post(`/groups/${group.id}/messages`).set(auth(alice.token)).send({ content: " hi " });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ content: "hi", authorId: alice.user.id, groupId: group.id });
  const after = await prisma.group.findUniqueOrThrow({ where: { id: group.id } });
  expect(after.updatedAt.getTime()).toBeGreaterThan(group.updatedAt.getTime());
});

it("PUT a message by a member who is not the author returns 403", async () => {
  const { alice, bob, group } = await setup();
  const msg = await prisma.message.create({ data: { content: "x", groupId: group.id, authorId: alice.user.id } });
  const res = await request(app).put(`/groups/${group.id}/messages/${msg.id}`).set(auth(bob.token)).send({ content: "y" });
  expect(res.status).toBe(403);
  expect(res.body.message).toBe("You can only change your own messages.");
});

it("PUT a message through a different group's path returns 404", async () => {
  const { alice, bob, group } = await setup();
  const other = await makeGroup({ members: [alice.user.id, bob.user.id] });
  const msg = await prisma.message.create({ data: { content: "x", groupId: group.id, authorId: alice.user.id } });
  const res = await request(app).put(`/groups/${other.id}/messages/${msg.id}`).set(auth(alice.token)).send({ content: "y" });
  expect(res.status).toBe(404);
});

it("author can edit (200) and delete (204)", async () => {
  const { alice, group } = await setup();
  const msg = await prisma.message.create({ data: { content: "x", groupId: group.id, authorId: alice.user.id } });
  const put = await request(app).put(`/groups/${group.id}/messages/${msg.id}`).set(auth(alice.token)).send({ content: " y " });
  expect(put.status).toBe(200);
  expect(put.body.content).toBe("y");
  const del = await request(app).delete(`/groups/${group.id}/messages/${msg.id}`).set(auth(alice.token));
  expect(del.status).toBe(204);
  expect(await prisma.message.count()).toBe(0);
});

it("POST returns 404 when the group is deleted after the membership check", async () => {
  const { alice, group } = await setup();
  const realTransaction = prisma.$transaction.bind(prisma) as (...args: unknown[]) => unknown;
  const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (...args: unknown[]) => {
    await prisma.group.delete({ where: { id: group.id } });
    return realTransaction(...args);
  });
  const res = await request(app).post(`/groups/${group.id}/messages`).set(auth(alice.token)).send({ content: "hi" });
  spy.mockRestore();
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Group not found.");
});
