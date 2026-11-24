import type { RequestHandler } from "express";
import * as messages from "./messages.service.js";

export const create: RequestHandler = async (req, res) => {
  const { groupId } = res.locals.params;
  res.status(201).json(await messages.createMessage(req.userId, groupId, { content: req.body.content, photoUrl: req.file?.path }));
};

export const update: RequestHandler = async (req, res) => {
  const { groupId, messageId } = res.locals.params;
  res.json(await messages.updateMessage(req.userId, groupId, messageId, req.body.content));
};

export const remove: RequestHandler = async (req, res) => {
  const { groupId, messageId } = res.locals.params;
  await messages.deleteMessage(req.userId, groupId, messageId);
  res.status(204).end();
};
