import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { emitToMembers } from "../../lib/io.js";
import { assertMember } from "../groups/groups.service.js";

async function ownMessage(callerId: number, groupId: number, messageId: number) {
  const memberIds = await assertMember(groupId, callerId);
  const message = await prisma.message.findFirst({ where: { id: messageId, groupId } });
  if (!message) throw new NotFoundError("Message not found.");
  if (message.authorId !== callerId) throw new ForbiddenError("You can only change your own messages.");
  return memberIds;
}

// The write has already committed, so a failed broadcast must not become an error response.
const notify = (memberIds: number[], event: string, payload: unknown) => {
  try {
    emitToMembers(memberIds, event, payload);
  } catch (error) {
    console.error(`Failed to emit ${event}`, error);
  }
};

// The row can vanish between the ownership check and the write
const messageGone = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
    ? new NotFoundError("Message not found.")
    : error;

// The group can vanish between the membership check and the write (FK violation or missing row)
const groupGone = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2025")
    ? new NotFoundError("Group not found.")
    : error;

export async function createMessage(callerId: number, groupId: number, input: { content?: string; photoUrl?: string }) {
  const memberIds = await assertMember(groupId, callerId);
  const content = input.content?.trim() || undefined;
  if (!content && !input.photoUrl) throw new BadRequestError("A message needs text or a photo.");
  // updatedAt is bumped so GET /groups orders chats by latest activity
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { content, photoUrl: input.photoUrl, groupId, authorId: callerId } }),
    prisma.group.update({ where: { id: groupId }, data: { updatedAt: new Date() } }),
  ]).catch((e) => {
    throw groupGone(e);
  });
  notify(memberIds, "newMessage", message);
  return message;
}

export async function updateMessage(callerId: number, groupId: number, messageId: number, content: string) {
  const memberIds = await ownMessage(callerId, groupId, messageId);
  const message = await prisma.message.update({ where: { id: messageId }, data: { content } }).catch((e) => {
    throw messageGone(e);
  });
  notify(memberIds, "messageUpdated", message);
  return message;
}

export async function deleteMessage(callerId: number, groupId: number, messageId: number) {
  const memberIds = await ownMessage(callerId, groupId, messageId);
  await prisma.message.delete({ where: { id: messageId } }).catch((e) => {
    throw messageGone(e);
  });
  notify(memberIds, "messageDeleted", messageId);
}
