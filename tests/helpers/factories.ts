import bcrypt from "bcrypt";
import { prisma } from "../../src/lib/prisma.js";
import { publicUser } from "../../src/lib/users.js";
import { signToken } from "../../src/lib/token.js";

// Cost 4 is bcrypt's minimum: tests don't need the slow hash.
const passwordHash = bcrypt.hashSync("password", 4);

export async function makeUser(username = `user${Math.random().toString(36).slice(2, 8)}`) {
  const user = await prisma.user.create({ data: { username, password: passwordHash }, select: publicUser });
  return { user, token: signToken(user) };
}

export const makeGroup = ({ members, admins = [], directMsg = false, name = "group" }: {
  members: number[];
  admins?: number[];
  directMsg?: boolean;
  name?: string;
}) =>
  prisma.group.create({
    data: {
      name,
      directMsg,
      members: { connect: members.map((id) => ({ id })) },
      admins: { connect: admins.map((id) => ({ id })) },
    },
  });
