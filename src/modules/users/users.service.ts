import createError from "http-errors";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { publicUser, withFormattedDate } from "../../lib/users.js";

const profileSelect = { ...publicUser, contacts: { select: publicUser } };

export function assertSelf(callerId: number, id: number) {
  if (callerId !== id) throw createError(403, "You can only change your own account.");
}

export async function listUsers() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, photo: true } });
  return users.map((u) => ({ ...u, photo: u.photo ?? env.DEFAULT_PICTURE }));
}

export async function getProfile(id: number) {
  const row = await prisma.user.findUnique({ where: { id }, select: profileSelect });
  if (!row) throw createError(404, "User not found.");
  return withFormattedDate(row);
}

export async function updateProfile(callerId: number, id: number, data: { username?: string; bio?: string; photo?: string }) {
  assertSelf(callerId, id);
  try {
    return withFormattedDate(await prisma.user.update({ where: { id }, data, select: profileSelect }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw createError(409, "Username already in use. Please try again with a different username");
      if (error.code === "P2025") throw createError(404, "User not found.");
    }
    throw error;
  }
}

export async function deleteUser(callerId: number, id: number) {
  assertSelf(callerId, id);
  await prisma.user.deleteMany({ where: { id } });
}

export async function setContacts(callerId: number, id: number, contactIds: number[]) {
  assertSelf(callerId, id);
  try {
    const row = await prisma.user.update({
      where: { id },
      data: { contacts: { connect: contactIds.map((contactId) => ({ id: contactId })) } },
      select: profileSelect,
    });
    return withFormattedDate(row);
  } catch (error) {
    // P2025: the user or one of the contacts doesn't exist
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw createError(404, "User not found.");
    }
    throw error;
  }
}
