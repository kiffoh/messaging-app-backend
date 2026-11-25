import { Prisma } from "@prisma/client";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { publicUser, withFormattedDate } from "../../lib/users.js";

const members = { select: publicUser };
const chatInclude = { members, messages: { orderBy: { createdAt: "desc" } } } as const;
const profileInclude = { members, admins: { select: publicUser } } as const;

const notMember = () => new ForbiddenError("You are not a member of this chat.");

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
  if (!group) throw new NotFoundError("Group not found.");
  return group;
}

export async function assertMember(groupId: number, userId: number) {
  const memberIds = (await load(groupId)).members.map((m) => m.id);
  if (!memberIds.includes(userId)) throw notMember();
  return memberIds;
}

export async function assertAdmin(groupId: number, userId: number) {
  if (!(await load(groupId)).admins.some((a) => a.id === userId)) {
    throw new ForbiddenError("Only a group admin can do that.");
  }
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
  if (!group) throw new NotFoundError("Group not found.");
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
  if (directMsg && memberIds.length !== 1) throw new BadRequestError("A direct message needs exactly one other member.");
  const ids = [...new Set([callerId, ...memberIds])];
  if (ids.length < 2) throw new BadRequestError("A chat needs at least one other member.");
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
  if (users.length !== ids.length) throw new NotFoundError("User not found.");

  const create = (db: Prisma.TransactionClient) =>
    db.group.create({
      data: directMsg
        ? { directMsg, members: { connect: ids.map((id) => ({ id })) } }
        : {
            directMsg,
            name: input.name || undefined, // unnamed chats are named per viewer by nameForViewer
            bio: input.bio || undefined,
            photo: input.photo ?? env.DEFAULT_GROUP_PICTURE,
            members: { connect: ids.map((id) => ({ id })) },
            admins: { connect: { id: callerId } },
          },
      include: chatInclude,
    });

  if (!directMsg) return { chat: nameForViewer(await create(prisma), callerId), created: true };

  const [lo, hi] = ids.sort((a, b) => a - b) as [number, number];
  return prisma.$transaction(async (tx) => {
    // Serialise per pair so concurrent double submits can't both miss the existing DM.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lo}::int, ${hi}::int)`;
    const existing = await tx.group.findFirst({
      where: { directMsg: true, AND: [{ members: { some: { id: lo } } }, { members: { some: { id: hi } } }, { members: { every: { id: { in: [lo, hi] } } } }] },
      include: chatInclude,
    });
    if (existing) return { chat: nameForViewer(existing, callerId), created: false };
    return { chat: nameForViewer(await create(tx), callerId), created: true };
  });
}
