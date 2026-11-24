import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registerRoutes } from "./defineRoute.js";
import { userRoutes } from "../routes/users.js";
import { groupRoutes } from "../routes/groups.js";
import { messageRoutes } from "../routes/messages.js";

const registry = new OpenAPIRegistry();
registerRoutes(registry, [...userRoutes, ...groupRoutes, ...messageRoutes]);

export const openApiDocument = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: "3.1.0",
  info: { title: "EasyMessage API", version: "1.0.0" },
});
