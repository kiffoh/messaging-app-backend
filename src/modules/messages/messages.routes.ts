import type { RequestHandler } from "express";
import { defineRoute } from "../../openapi/defineRoute.js";
import { badRequest, formBody, jsonBody, jsonResponse, messageOnly } from "../../lib/schemas.js";
import { uploadMessagePhoto } from "../../middleware/upload.js";
import { validate } from "../../middleware/validate.js";
import { assertMember } from "../groups/groups.service.js";
import * as controller from "./messages.controller.js";
import * as s from "./messages.schemas.js";

const memberOnly: RequestHandler = async (req, res, next) => {
  await assertMember(res.locals.params.groupId, req.userId);
  next();
};

const tags = ["Messages"];
const notMember = jsonResponse("Not a member of this group", messageOnly);
const notFound = jsonResponse("Group or message not found", messageOnly);
const notAuthor = jsonResponse("Not a member, or not the author", messageOnly);

export const messageRoutes = [
  defineRoute({
    method: "post",
    path: "/groups/{groupId}/messages",
    summary: "Send a message",
    description: "Needs text, a photo or both. Emits newMessage to every member's socket room.",
    tags,
    request: { params: s.groupParams, body: formBody(s.createMessageForm) },
    responses: { 201: jsonResponse("The new message", s.message), 400: badRequest, 403: notMember, 404: notFound },
    // Before multer: otherwise a non-member's photo is stored in Cloudinary before the 403.
    middleware: [memberOnly, uploadMessagePhoto.single("photo"), validate(s.createMessageBody)],
    handler: controller.create,
  }),

  defineRoute({
    method: "put",
    path: "/groups/{groupId}/messages/{messageId}",
    summary: "Edit your message",
    description: "Emits messageUpdated to every member's socket room.",
    tags,
    request: { params: s.messageParams, body: jsonBody(s.updateMessageBody) },
    responses: { 200: jsonResponse("The updated message", s.message), 400: badRequest, 403: notAuthor, 404: notFound },
    middleware: [validate(s.updateMessageBody)],
    handler: controller.update,
  }),

  defineRoute({
    method: "delete",
    path: "/groups/{groupId}/messages/{messageId}",
    summary: "Delete your message",
    description: "Emits messageDeleted (the message id) to every member's socket room.",
    tags,
    request: { params: s.messageParams },
    responses: { 204: { description: "Deleted" }, 400: badRequest, 403: notAuthor, 404: notFound },
    handler: controller.remove,
  }),
];
