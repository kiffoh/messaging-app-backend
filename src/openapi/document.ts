import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registerRoutes } from "./defineRoute.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { userRoutes } from "../modules/users/users.routes.js";
import { groupRoutes } from "../modules/groups/groups.routes.js";
import { messageRoutes } from "../modules/messages/messages.routes.js";

const registry = new OpenAPIRegistry();
registry.registerComponent("securitySchemes", "bearerAuth", { type: "http", scheme: "bearer", bearerFormat: "JWT" });
registerRoutes(registry, [...authRoutes, ...userRoutes, ...groupRoutes, ...messageRoutes]);

export const openApiDocument = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: "3.1.0",
  info: { title: "EasyMessage API", version: "1.0.0" },
});
