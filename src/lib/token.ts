import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors.js";
import type { User } from "@prisma/client";
import { env } from "../config/env.js";
import { withFormattedDate } from "./users.js";

// The frontend decodes these claims for the profile, so they must not change.
export const signToken = (user: Pick<User, "id" | "username" | "bio" | "createdAt" | "photo">) => {
  const { id, username, bio, photo, createdAtDate, createdAtTime } = withFormattedDate(user);
  return jwt.sign({ id, username, bio, createdAtDate, createdAtTime, photo }, env.SECRET_KEY, { expiresIn: "1h" });
};

export const verifyToken = (token: string): { id: number; exp: number } => {
  try {
    const payload = jwt.verify(token, env.SECRET_KEY);
    if (typeof payload === "string" || typeof payload.id !== "number" || typeof payload.exp !== "number") throw new Error("bad claims");
    return { id: payload.id, exp: payload.exp };
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
};
