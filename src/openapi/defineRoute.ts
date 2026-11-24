import type { Router, RequestHandler } from "express";
import type { OpenAPIRegistry, RouteConfig } from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";

type Method = "get" | "post" | "put" | "delete";

// One route: the OpenAPI description plus what Express needs to serve it.
export type RouteDef = Omit<RouteConfig, "method"> & {
  method: Method;
  auth?: false; // routes are authenticated unless they opt out
  middleware?: RequestHandler[]; // e.g. an upload, validate(schema)
  handler: RequestHandler;
};

export const defineRoute = (def: RouteDef) => def;

// OpenAPI writes /users/{userId}, Express wants /users/:userId
const toExpressPath = (path: string) => path.replace(/\{(\w+)\}/g, ":$1");

// Parsed path params go to res.locals.params: Express 5's req.params is a getter, not assignable.
const parseParams = (schema: ZodType): RequestHandler => (req, res, next) => {
  res.locals.params = schema.parse(req.params);
  next();
};

export function mountRoutes(router: Router, routes: RouteDef[]) {
  for (const { method, path, auth, request, middleware = [], handler } of routes) {
    const chain = [
      ...(auth === false ? [] : [requireAuth]),
      ...(request?.params ? [parseParams(request.params as ZodType)] : []),
      ...middleware,
      handler,
    ];
    router[method](toExpressPath(path), ...chain);
  }
}

export function registerRoutes(registry: OpenAPIRegistry, routes: RouteDef[]) {
  for (const { middleware, handler, auth, ...doc } of routes) {
    registry.registerPath(auth === false ? doc : { ...doc, security: [{ bearerAuth: [] }] });
  }
}
