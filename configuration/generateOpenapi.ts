import { writeFileSync } from "node:fs";
import { z } from "zod";
import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { userSignUpSchema, userSchema, groupSchema } from "./validation.js";

const registry = new OpenAPIRegistry();

const validationError = z.object({
  status: z.literal("error"),
  errors: z.array(z.object({ field: z.string(), message: z.string() })),
});
const badRequest = {
  400: { description: "Validation failed", content: { "application/json": { schema: validationError } } },
};
const json = (schema: z.ZodType) => ({ content: { "application/json": { schema } } });
const form = (schema: z.ZodType) => ({ content: { "multipart/form-data": { schema } } });

// shortcut: only routes that have a request schema are documented, add response schemas and the rest as they get Zod types
registry.registerPath({
  method: "post", path: "/users/signup", tags: ["Users"],
  request: { body: json(userSignUpSchema) },
  responses: { 201: { description: "User created" }, ...badRequest },
});
registry.registerPath({
  method: "put", path: "/users/{userId}/profile", tags: ["Users"],
  request: { params: z.object({ userId: z.coerce.number() }), body: form(userSchema) },
  responses: { 200: { description: "Profile updated" }, ...badRequest },
});
registry.registerPath({
  method: "post", path: "/groups/createGroup", tags: ["Groups"],
  request: { body: form(groupSchema) },
  responses: { 201: { description: "Group created" }, ...badRequest },
});
registry.registerPath({
  method: "put", path: "/groups/{groupId}/profile", tags: ["Groups"],
  request: { params: z.object({ groupId: z.coerce.number() }), body: form(groupSchema) },
  responses: { 200: { description: "Group updated" }, ...badRequest },
});

const doc = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: "3.1.0",
  info: { title: "EasyMessage API", version: "1.0.0" },
});
writeFileSync("openapi.json", JSON.stringify(doc, null, 2) + "\n");
console.log("Wrote openapi.json");
