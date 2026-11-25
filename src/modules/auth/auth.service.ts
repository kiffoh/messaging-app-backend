import bcrypt from "bcrypt";
import { ConflictError, UnauthorizedError } from "../../lib/errors.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { publicUser } from "../../lib/users.js";
import { signToken } from "../../lib/token.js";

// Compared against when the username is unknown so both failures cost one bcrypt run.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

export async function signUp(username: string, password: string) {
  try {
    const user = await prisma.user.create({
      data: { username, password: await bcrypt.hash(password, 10) },
      select: publicUser,
    });
    return { token: signToken(user), user };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Username already in use. Please try again with a different username");
    }
    throw error;
  }
}

export async function logIn(username: string, password: string) {
  const row = await prisma.user.findUnique({ where: { username }, select: { ...publicUser, password: true } });
  // One message for both cases so the response doesn't reveal which usernames exist.
  const ok = await bcrypt.compare(password, row?.password ?? DUMMY_HASH);
  if (!row || !ok) {
    throw new UnauthorizedError("Invalid username or password.");
  }
  const { password: _hash, ...user } = row;
  return { token: signToken(user), user };
}
