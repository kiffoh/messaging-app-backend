import type { RequestHandler } from "express";
import * as users from "./users.service.js";

export const list: RequestHandler = async (_req, res) => {
  res.json(await users.listUsers());
};

export const get: RequestHandler = async (_req, res) => {
  res.json(await users.getProfile(res.locals.params.userId));
};

export const update: RequestHandler = async (req, res) => {
  const { username, bio } = req.body;
  res.json(await users.updateProfile(req.userId, res.locals.params.userId, { username, bio, photo: req.file?.path }));
};

export const remove: RequestHandler = async (req, res) => {
  await users.deleteUser(req.userId, res.locals.params.userId);
  res.status(204).end();
};

export const setContacts: RequestHandler = async (req, res) => {
  res.json(await users.setContacts(req.userId, res.locals.params.userId, req.body.contactIds));
};
