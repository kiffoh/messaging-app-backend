import type { RequestHandler } from "express";
import { z } from "zod";
import { defineRoute } from "../../openapi/defineRoute.js";
import { badRequest, formBody, jsonResponse, messageOnly } from "../../lib/schemas.js";
import { uploadGroupPhoto } from "../../middleware/upload.js";
import { validate } from "../../middleware/validate.js";
import { assertAdmin } from "./groups.service.js";
import * as controller from "./groups.controller.js";
import * as s from "./groups.schemas.js";

const adminOnly: RequestHandler = async (req, res, next) => {
  await assertAdmin(res.locals.params.groupId, req.userId);
  next();
};

const tags = ["Groups"];
const notMember = jsonResponse("Not a member of this group", messageOnly);
const notAdmin = jsonResponse("Not an admin of this group", messageOnly);
const notFound = jsonResponse("Group not found", messageOnly);

export const groupRoutes = [
  defineRoute({
    method: "get",
    path: "/groups",
    summary: "List your chats, newest first, named for you",
    tags,
    responses: { 200: jsonResponse("Your chats", z.array(s.chatListItem)) },
    handler: controller.list,
  }),

  defineRoute({
    method: "post",
    path: "/groups",
    summary: "Create a group, or start a direct message",
    description:
      "You are always added as a member. A direct message needs exactly one other member id, name, photo and bio are ignored, and an existing DM with that person is returned with 200. For a group you become admin, and without a name one is made from the members' usernames.",
    tags,
    request: {
      body: {
        content: {
          "application/json": { schema: s.createGroupBody },
          "multipart/form-data": { schema: s.createGroupForm },
        },
      },
    },
    responses: {
      200: jsonResponse("The existing direct message", s.chatListItem),
      201: jsonResponse("Chat created", s.chatListItem),
      400: badRequest,
      404: jsonResponse("A member was not found", messageOnly),
    },
    middleware: [uploadGroupPhoto.single("photo"), validate(s.createGroupBody)],
    handler: controller.create,
  }),

  defineRoute({
    method: "get",
    path: "/groups/{groupId}",
    summary: "Get a group with its members and admins",
    tags,
    request: { params: s.groupIdParams },
    responses: { 200: jsonResponse("The group", s.groupProfile), 400: badRequest, 403: notMember, 404: notFound },
    handler: controller.get,
  }),

  defineRoute({
    method: "put",
    path: "/groups/{groupId}",
    summary: "Update a group's name, bio or photo (admins only)",
    tags,
    request: { params: s.groupIdParams, body: formBody(s.updateGroupForm) },
    responses: { 200: jsonResponse("The updated group", s.groupProfile), 400: badRequest, 403: notAdmin, 404: notFound },
    // Before multer: otherwise a non-admin's photo is stored in Cloudinary before the 403.
    middleware: [adminOnly, uploadGroupPhoto.single("photo"), validate(s.updateGroupBody)],
    handler: controller.update,
  }),

  defineRoute({
    method: "delete",
    path: "/groups/{groupId}",
    summary: "Delete a group and its messages (admins only)",
    tags,
    request: { params: s.groupIdParams },
    responses: { 204: { description: "Deleted" }, 400: badRequest, 403: notAdmin, 404: notFound },
    middleware: [adminOnly],
    handler: controller.remove,
  }),
];
