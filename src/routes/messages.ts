import * as messageController from "../controllers/messages.controller.js";
import { uploadMessagePhoto } from "../middleware/upload.js";
import { defineRoute } from "../openapi/defineRoute.js";
import { messageOnly, formBody, jsonBody, jsonResponse } from "../lib/schemas.js";
import { userIdParams } from "../modules/users/users.schemas.js";
import { groupWithMembersAndMessages } from "../schemas/group.js";
import * as s from "../schemas/message.js";
import { z } from "zod";

const tags = ["Messages"];

export const messageRoutes = [
  defineRoute({
    method: "get",
    auth: false, // until the module is moved onto token auth
    path: "/messages/{userId}",
    summary: "List every chat a user is in, with members and messages",
    description: "Newest chat first, newest message first. Unnamed chats are named for this user.",
    tags,
    request: { params: userIdParams },
    responses: {
      200: jsonResponse("The user's chats", z.array(groupWithMembersAndMessages)),
      500: jsonResponse("Internal Server Error", messageOnly),
    },
    handler: messageController.getMessages,
  }),

  defineRoute({
    method: "post",
    auth: false, // until the module is moved onto token auth
    path: "/messages/{chatId}",
    summary: "Send a message",
    description: "The chat is taken from the groupId field of the body, the chatId in the path is not used. Emits a newMessage socket event.",
    tags,
    request: { params: s.chatParams, body: formBody(s.createMessageBody) },
    responses: {
      201: jsonResponse("The new message", s.message),
      500: jsonResponse("Internal Server Error", messageOnly),
    },
    middleware: [uploadMessagePhoto.single("photoUrl")],
    handler: messageController.createMessage,
  }),

  defineRoute({
    method: "put",
    auth: false, // until the module is moved onto token auth
    path: "/messages/{chatId}/{messageId}",
    summary: "Edit a message",
    description: "Emits a messageUpdated socket event.",
    tags,
    request: { params: s.messageParams, body: jsonBody(s.updateMessageBody) },
    responses: {
      200: jsonResponse("The updated message", s.message),
      500: jsonResponse("Could not update the message", messageOnly),
    },
    handler: messageController.updateMessage,
  }),

  defineRoute({
    method: "delete",
    auth: false, // until the module is moved onto token auth
    path: "/messages/{chatId}/{messageId}",
    summary: "Delete a message",
    description: "Emits a messageDeleted socket event.",
    tags,
    request: { params: s.messageParams },
    responses: {
      200: jsonResponse("Deleted", messageOnly),
      404: jsonResponse("Message not found", messageOnly),
      500: jsonResponse("Unknown error", messageOnly),
    },
    handler: messageController.deleteMessage,
  }),
];
