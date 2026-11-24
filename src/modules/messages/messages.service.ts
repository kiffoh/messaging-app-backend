import createError from "http-errors";
import { prisma } from "../../lib/prisma.js";
import { emitToMembers } from "../../lib/io.js";
import { assertMember, memberIdsOf } from "../groups/groups.service.js";

async function ownMessage(callerId: number, groupId: number, messageId: number) {
  await assertMember(groupId, callerId);
  const message = await prisma.message.findFirst({ where: { id: messageId, groupId } });
  if (!message) throw createError(404, "Message not found.");
  if (message.authorId !== callerId) throw createError(403, "You can only change your own messages.");
}

const notify = async (groupId: number, event: string, payload: unknown) =>
  emitToMembers(await memberIdsOf(groupId), event, payload);

export async function createMessage(callerId: number, groupId: number, input: { content?: string; photoUrl?: string }) {
  await assertMember(groupId, callerId);
  const content = input.content?.trim() || undefined;
  if (!content && !input.photoUrl) throw createError(400, "A message needs text or a photo.");
  // updatedAt is bumped so GET /groups orders chats by latest activity
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { content, photoUrl: input.photoUrl, groupId, authorId: callerId } }),
    prisma.group.update({ where: { id: groupId }, data: { updatedAt: new Date() } }),
  ]);
  await notify(groupId, "newMessage", message);
  return message;
}

export async function updateMessage(callerId: number, groupId: number, messageId: number, content: string) {
  await ownMessage(callerId, groupId, messageId);
  const message = await prisma.message.update({ where: { id: messageId }, data: { content } });
  await notify(groupId, "messageUpdated", message);
  return message;
}

export async function deleteMessage(callerId: number, groupId: number, messageId: number) {
  await ownMessage(callerId, groupId, messageId);
  await prisma.message.delete({ where: { id: messageId } });
  await notify(groupId, "messageDeleted", messageId);
}
