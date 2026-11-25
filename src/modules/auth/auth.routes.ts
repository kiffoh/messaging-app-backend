import { rateLimit } from "express-rate-limit";
import { defineRoute } from "../../openapi/defineRoute.js";
import { badRequest, jsonBody, jsonResponse, messageOnly } from "../../lib/schemas.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./auth.controller.js";
import * as s from "./auth.schemas.js";

const tags = ["Auth"];

// One instance on both routes, so signup and login share a per-IP budget.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

const tooManyRequests = jsonResponse("Too many attempts", messageOnly);

export const authRoutes = [
  defineRoute({
    method: "post",
    auth: false,
    path: "/auth/signup",
    summary: "Create a user",
    tags,
    request: { body: jsonBody(s.signUpBody) },
    responses: {
      201: jsonResponse("User created", s.authResult),
      400: badRequest,
      409: jsonResponse("Username already in use", messageOnly),
      429: tooManyRequests,
    },
    middleware: [authLimiter, validate(s.signUpBody)],
    handler: controller.signUp,
  }),

  defineRoute({
    method: "post",
    auth: false,
    path: "/auth/login",
    summary: "Log in and receive a JWT",
    tags,
    request: { body: jsonBody(s.logInBody) },
    responses: {
      200: jsonResponse("Logged in", s.authResult),
      400: badRequest,
      401: jsonResponse("Invalid username or password", messageOnly),
      429: tooManyRequests,
    },
    middleware: [authLimiter, validate(s.logInBody)],
    handler: controller.logIn,
  }),
];
