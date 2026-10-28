import * as userController from "../controllers/user.controller.js";
import { uploadUserPhoto } from "../middleware/multer.js";
import { userSchema, validateUser, validateUserSignUp } from "../middleware/validation.js";
import { defineRoute } from "../configuration/defineRoute.js";
import { badRequest, binary, formBody, jsonBody, jsonResponse, messageOnly, statusAndMessage } from "../schemas/common.js";
import * as s from "../schemas/user.js";
import { z } from "zod";

const tags = ["Users"];

const updateUserBody = userSchema.extend({ photo: binary.optional().describe("Image file") });

export const userRoutes = [
  defineRoute({
    method: "post",
    path: "/users/signup",
    summary: "Create a user",
    tags,
    request: { body: jsonBody(s.signUpBody) },
    responses: {
      201: jsonResponse("User created", s.signUpResult),
      400: badRequest,
      409: jsonResponse("Username already in use", statusAndMessage),
      500: jsonResponse("Could not create the user", statusAndMessage),
    },
    middleware: [validateUserSignUp],
    handler: userController.createUser,
  }),

  defineRoute({
    method: "post",
    path: "/users/login",
    summary: "Log in and receive a JWT",
    tags,
    request: { body: jsonBody(s.logInBody) },
    responses: {
      200: jsonResponse("Logged in", s.logInResult),
      400: jsonResponse("Invalid username or password", messageOnly),
    },
    handler: userController.logIn,
  }),

  defineRoute({
    method: "get",
    path: "/users/{userId}/profile",
    summary: "Get a user's profile and contacts",
    tags,
    request: { params: s.userIdParams },
    responses: {
      200: jsonResponse("The user", s.userWithContacts),
      400: jsonResponse("Invalid user id", messageOnly),
      404: jsonResponse("User not found", messageOnly),
      500: jsonResponse("Unknown error", messageOnly),
    },
    handler: userController.getUser,
  }),

  defineRoute({
    method: "put",
    path: "/users/{userId}/profile",
    summary: "Update a user's username, bio or photo",
    tags,
    request: { params: s.userIdParams, body: formBody(updateUserBody) },
    responses: {
      200: jsonResponse("The updated user", s.userWithContacts),
      400: badRequest,
      409: jsonResponse("Username already in use", statusAndMessage),
      500: jsonResponse("Could not update the user", statusAndMessage),
    },
    middleware: [uploadUserPhoto.single("photo"), validateUser],
    handler: userController.updateUser,
  }),

  defineRoute({
    method: "delete",
    path: "/users/{userId}/profile",
    summary: "Delete a user",
    tags,
    request: { params: s.userIdParams },
    responses: {
      200: jsonResponse("Deleted", messageOnly),
      404: jsonResponse("User not found", messageOnly),
      500: jsonResponse("Unknown error", messageOnly),
    },
    handler: userController.deleteUser,
  }),

  defineRoute({
    method: "get",
    path: "/users/usernames",
    summary: "List every user's id, username and photo",
    tags,
    responses: {
      200: jsonResponse("All users", z.array(s.userSummary)),
      404: jsonResponse("No users found", messageOnly),
      500: jsonResponse("Unknown error", messageOnly),
    },
    handler: userController.getAllUsernames,
  }),

  defineRoute({
    method: "put",
    path: "/users/{userId}/update-contacts",
    summary: "Add contacts to a user",
    tags,
    request: { params: s.userIdParams, body: jsonBody(s.contactsBody) },
    responses: {
      200: jsonResponse("The updated user", s.userWithContactsAndFollowers),
      500: jsonResponse("Unknown error", messageOnly),
    },
    handler: userController.updateUserContacts,
  }),
];
