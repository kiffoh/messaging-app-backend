import * as groupController from "../controllers/group.controller.js";
import { uploadGroupPhoto } from "../middleware/multer.js";
import { validateGroup } from "../middleware/validation.js";
import { defineRoute } from "../configuration/defineRoute.js";
import { badRequest, formBody, jsonBody, jsonResponse, messageOnly, statusAndMessage } from "../schemas/common.js";
import * as s from "../schemas/group.js";
import { z } from "zod";

const tags = ["Groups"];

export const groupRoutes = [
  defineRoute({
    method: "get",
    path: "/groups/{groupId}/profile",
    summary: "Get a group with its members and admins",
    tags,
    request: { params: s.groupIdParams },
    responses: {
      200: jsonResponse("The group. An unnamed group gets a name made from its members", s.groupProfile),
      400: jsonResponse("Invalid group id", messageOnly),
      404: jsonResponse("Group not found", messageOnly),
      500: jsonResponse("Unknown error", messageOnly),
    },
    handler: groupController.getGroup,
  }),

  defineRoute({
    method: "put",
    path: "/groups/{groupId}/profile",
    summary: "Update a group's name, bio or photo",
    tags,
    request: { params: s.groupIdParams, body: formBody(s.updateGroupBody) },
    responses: {
      200: jsonResponse("The updated group", s.groupProfile),
      400: badRequest,
      500: jsonResponse("Could not update the group", statusAndMessage),
    },
    middleware: [uploadGroupPhoto.single("photo"), validateGroup],
    handler: groupController.updateGroup,
  }),

  defineRoute({
    method: "delete",
    path: "/groups/{groupId}/profile",
    summary: "Delete a group and its messages (admins only)",
    description: "The caller is identified by the user-id header, there is no token check.",
    tags,
    request: { params: s.groupIdParams, headers: s.userIdHeader },
    responses: {
      200: jsonResponse("Deleted", messageOnly),
      403: jsonResponse("Caller is not an admin of the group", messageOnly),
      404: jsonResponse("Group not found", messageOnly),
      500: jsonResponse("Unknown error", messageOnly),
    },
    handler: groupController.deleteGroup,
  }),

  defineRoute({
    method: "post",
    path: "/groups/createDirectMessage",
    summary: "Start a direct message chat, or return the existing one",
    tags,
    request: { body: jsonBody(s.directMessageBody) },
    responses: {
      200: jsonResponse("The chat already existed", s.existingGroupResult),
      201: jsonResponse("Chat created", s.newGroupResult),
      400: jsonResponse("No members given", z.object({ message: z.string() })),
      500: jsonResponse("Could not create the chat", statusAndMessage),
    },
    handler: groupController.createDirectMessage,
  }),

  defineRoute({
    method: "post",
    path: "/groups/createGroup",
    summary: "Create a group chat",
    description: "Without a name, one is made from the members' usernames. The first member becomes the admin.",
    tags,
    request: { body: formBody(s.createGroupBody) },
    responses: {
      200: jsonResponse("A group with that name and members already exists", s.existingGroupResult),
      201: jsonResponse("Group created", s.newGroupResult),
      400: badRequest,
      500: jsonResponse("Could not create the group", statusAndMessage),
    },
    middleware: [uploadGroupPhoto.single("groupPhoto"), validateGroup],
    handler: groupController.createGroup,
  }),
];
