import { z } from "zod";
import { defineRoute } from "../../openapi/defineRoute.js";
import { badRequest, formBody, jsonBody, jsonResponse, messageOnly } from "../../lib/schemas.js";
import { uploadUserPhoto } from "../../middleware/upload.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./users.controller.js";
import * as s from "./users.schemas.js";

const tags = ["Users"];
const notSelf = jsonResponse("Not your account", messageOnly);
const notFound = jsonResponse("User not found", messageOnly);

export const userRoutes = [
  defineRoute({
    method: "get",
    path: "/users",
    summary: "List every user's id, username and photo",
    tags,
    responses: { 200: jsonResponse("All users", z.array(s.userSummary)) },
    handler: controller.list,
  }),

  defineRoute({
    method: "get",
    path: "/users/{userId}",
    summary: "Get a user's profile and contacts",
    tags,
    request: { params: s.userIdParams },
    responses: { 200: jsonResponse("The user", s.userProfile), 400: badRequest, 404: notFound },
    handler: controller.get,
  }),

  defineRoute({
    method: "put",
    path: "/users/{userId}",
    summary: "Update your username, bio or photo",
    tags,
    request: { params: s.userIdParams, body: formBody(s.updateUserForm) },
    responses: {
      200: jsonResponse("The updated user", s.userProfile),
      400: badRequest,
      403: notSelf,
      409: jsonResponse("Username already in use", messageOnly),
    },
    middleware: [uploadUserPhoto.single("photo"), validate(s.updateUserBody)],
    handler: controller.update,
  }),

  defineRoute({
    method: "delete",
    path: "/users/{userId}",
    summary: "Delete your account",
    tags,
    request: { params: s.userIdParams },
    responses: { 204: { description: "Deleted" }, 400: badRequest, 403: notSelf },
    handler: controller.remove,
  }),

  defineRoute({
    method: "put",
    path: "/users/{userId}/contacts",
    summary: "Add contacts to your account",
    tags,
    request: { params: s.userIdParams, body: jsonBody(s.contactsBody) },
    responses: { 200: jsonResponse("The updated user", s.userProfile), 400: badRequest, 403: notSelf, 404: notFound },
    middleware: [validate(s.contactsBody)],
    handler: controller.setContacts,
  }),
];
