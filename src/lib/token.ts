import jwt from "jsonwebtoken";
import createError from "http-errors";
import type { User } from "@prisma/client";
import { env } from "../config/env.js";
import { withFormattedDate } from "./users.js";

// The frontend decodes these claims for the profile, so they must not change.
export const signToken = (user: Pick<User, "id" | "username" | "bio" | "createdAt" | "photo">) => {
  const { id, username, bio, photo, createdAtDate, createdAtTime } = withFormattedDate(user);
  return jwt.sign({ id, username, bio, createdAtDate, createdAtTime, photo }, env.SECRET_KEY, { expiresIn: "1h" });
};

export const verifyToken = (token: string): { id: number } => {
  try {
    const payload = jwt.verify(token, env.SECRET_KEY);
    if (typeof payload === "string" || typeof payload.id !== "number") throw new Error("bad claims");
    return { id: payload.id };
  } catch {
    throw createError(401, "Invalid or expired token");
  }
};
