import type { RequestHandler } from "express";
import createError from "http-errors";
import { verifyToken } from "../lib/token.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw createError(401, "Invalid or expired token");
  req.userId = verifyToken(token).id;
  next();
};
