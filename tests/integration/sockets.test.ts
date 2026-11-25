import request from "supertest";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { env } from "../../src/config/env.js";
import { app, server } from "../../src/app.js";
import { io, emitToMembers } from "../../src/lib/io.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetDb } from "../helpers/db.js";
import { makeUser, makeGroup } from "../helpers/factories.js";

let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.close());
  await io.close(); // also closes the attached http server
});

beforeEach(resetDb);

const open = (auth: object) =>
  new Promise<Socket>((resolve, reject) => {
    const s = connect(url, { auth, transports: ["websocket"] });
    sockets.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });

it("connecting without a token fails with connect_error unauthorized", async () => {
  await expect(open({})).rejects.toThrow("unauthorized");
});

it("message events reach the group's members only", async () => {
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const carol = await makeUser("carol");
  const dm = await makeGroup({ members: [alice.user.id, bob.user.id], directMsg: true });
  const [a, b, c] = await Promise.all([alice, bob, carol].map((u) => open({ token: u.token })));

  const onBob = vi.fn();
  const onCarol = vi.fn();
  const bobGot = (event: string) => new Promise((r) => b.once(event, r));
  b.on("newMessage", onBob);
  c.on("newMessage", onCarol);
  c.on("messageUpdated", onCarol);
  c.on("messageDeleted", onCarol);

  const base = `/groups/${dm.id}/messages`;
  const bearer = { Authorization: `Bearer ${alice.token}` };
  const created = bobGot("newMessage");
  const res = await request(app).post(base).set(bearer).send({ content: "hi" });
  expect(await created).toMatchObject({ id: res.body.id, content: "hi" });

  const updated = bobGot("messageUpdated");
  await request(app).put(`${base}/${res.body.id}`).set(bearer).send({ content: "yo" });
  expect(await updated).toMatchObject({ content: "yo" });

  const deleted = bobGot("messageDeleted");
  await request(app).delete(`${base}/${res.body.id}`).set(bearer);
  expect(await deleted).toBe(res.body.id);

  await new Promise((r) => setTimeout(r, 200));
  expect(onCarol).not.toHaveBeenCalled();
  expect(onBob).toHaveBeenCalledOnce();
  expect(a.connected).toBe(true);
  expect(await prisma.message.count()).toBe(0);
});

it("emitToMembers with no members reaches nobody", async () => {
  const alice = await makeUser("alice");
  const a = await open({ token: alice.token });
  const spy = vi.fn();
  a.on("newMessage", spy);
  emitToMembers([], "newMessage", { content: "hi" });
  await new Promise((r) => setTimeout(r, 200));
  expect(spy).not.toHaveBeenCalled();
});

it("disconnects a socket when its token expires", async () => {
  const user = await makeUser("alice");
  const token = jwt.sign({ id: user.user.id }, env.SECRET_KEY, { expiresIn: "1s" });
  const s = await open({ token });
  await new Promise((r) => s.once("disconnect", r));
}, 2500);
