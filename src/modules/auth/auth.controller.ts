import type { RequestHandler } from "express";
import * as auth from "./auth.service.js";

export const signUp: RequestHandler = async (req, res) => {
  res.status(201).json(await auth.signUp(req.body.username, req.body.password));
};

export const logIn: RequestHandler = async (req, res) => {
  res.json(await auth.logIn(req.body.username, req.body.password));
};
