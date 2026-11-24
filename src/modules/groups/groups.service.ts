import createError from "http-errors";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { publicUser, withFormattedDate } from "../../lib/users.js";

const members = { select: publicUser };
const chatInclude = { members, messages: { orderBy: { createdAt: "desc" } } } as const;
const profileInclude = { members, admins: { select: publicUser } } as const;

const notMember = () => createError(403, "You are not a member of this chat.");

export function nameFromMembers(usernames: string[]) {
  if (usernames.length < 2) return usernames[0] ?? "";
  return `${usernames.slice(0, -1).join(", ")} & ${usernames.at(-1)}`;
}

type Named = {
  name: string | null;
  photo: string | null;
  directMsg: boolean;
  members: { id: number; username: string; photo: string | null }[];
};

// Unnamed chats are named after the other members, a DM also takes the other member's photo. Returns a copy.
export function nameForViewer<T extends Named>(group: T, viewerId: number): T {
  const others = group.members.filter((m) => m.id !== viewerId);
  const name = group.name ?? nameFromMembers(others.map((m) => m.username));
  const photo = group.directMsg ? others[0]?.photo ?? group.photo : group.photo;
  return { ...group, name, photo: photo ?? (group.directMsg ? env.DEFAULT_PICTURE : env.DEFAULT_GROUP_PICTURE) };
}

async function load(groupId: number) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { members: { select: { id: true } }, admins: { select: { id: true } } } });
  if (!group) throw createError(404, "Group not found.");
  return group;
}

export async function assertMember(groupId: number, userId: number) {
  if (!(await load(groupId)).members.some((m) => m.id === userId)) throw notMember();
}

export async function assertAdmin(groupId: number, userId: number) {
  if (!(await load(groupId)).admins.some((a) => a.id === userId)) {
    throw createError(403, "Only a group admin can do that.");
  }
}

export async function memberIdsOf(groupId: number) {
  return (await load(groupId)).members.map((m) => m.id);
}

export async function listChats(userId: number) {
  const chats = await prisma.group.findMany({
    where: { members: { some: { id: userId } } },
    include: chatInclude,
    orderBy: { updatedAt: "desc" },
  });
  return chats.map((c) => nameForViewer(c, userId));
}

export async function getProfile(groupId: number, viewerId: number) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: profileInclude });
  if (!group) throw createError(404, "Group not found.");
  if (!group.members.some((m) => m.id === viewerId)) throw notMember();
  return withFormattedDate(nameForViewer(group, viewerId));
}

export async function updateGroup(groupId: number, viewerId: number, data: { name?: string; bio?: string; photo?: string }) {
  await prisma.group.update({ where: { id: groupId }, data });
  return getProfile(groupId, viewerId);
}

export async function deleteGroup(groupId: number) {
  await prisma.$transaction([prisma.message.deleteMany({ where: { groupId } }), prisma.group.delete({ where: { id: groupId } })]);
}

export async function createChat(
  callerId: number,
  input: { memberIds: number[]; directMsg: boolean; name?: string; bio?: string; photo?: string },
) {
  const { memberIds, directMsg } = input;
  if (directMsg && (memberIds.length !== 1 || memberIds[0] === callerId)) {
    throw createError(400, "A direct message needs exactly one other member.");
  }
  const ids = [...new Set([callerId, ...memberIds])];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
  if (users.length !== ids.length) throw createError(404, "User not found.");

  if (directMsg) {
    const existing = await prisma.group.findFirst({
      where: { directMsg: true, AND: [{ members: { some: { id: callerId } } }, { members: { some: { id: memberIds[0] } } }, { members: { every: { id: { in: [callerId, memberIds[0]] } } } }] },
      include: chatInclude,
    });
    if (existing) return { chat: nameForViewer(existing, callerId), created: false };
  }

  const usernames = ids.map((id) => users.find((u) => u.id === id)!.username);
  const chat = await prisma.group.create({
    data: directMsg
      ? { directMsg, members: { connect: ids.map((id) => ({ id })) } }
      : {
          directMsg,
          name: input.name || nameFromMembers(usernames),
          bio: input.bio || undefined,
          photo: input.photo ?? env.DEFAULT_GROUP_PICTURE,
          members: { connect: ids.map((id) => ({ id })) },
          admins: { connect: { id: callerId } },
        },
    include: chatInclude,
  });
  return { chat: nameForViewer(chat, callerId), created: true };
}
