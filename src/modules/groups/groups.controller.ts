import type { RequestHandler } from "express";
import * as groups from "./groups.service.js";

export const list: RequestHandler = async (req, res) => {
  res.json(await groups.listChats(req.userId));
};

export const create: RequestHandler = async (req, res) => {
  const { chat, created } = await groups.createChat(req.userId, { ...req.body, photo: req.file?.path });
  res.status(created ? 201 : 200).json(chat);
};

export const get: RequestHandler = async (req, res) => {
  res.json(await groups.getProfile(res.locals.params.groupId, req.userId));
};

export const update: RequestHandler = async (req, res) => {
  const { name, bio } = req.body;
  res.json(await groups.updateGroup(res.locals.params.groupId, req.userId, { name, bio, photo: req.file?.path }));
};

export const remove: RequestHandler = async (_req, res) => {
  await groups.deleteGroup(res.locals.params.groupId);
  res.status(204).end();
};
