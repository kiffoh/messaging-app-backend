import type { Router, Request, Response, NextFunction, RequestHandler } from "express";
import type { Server } from "socket.io";
import type { OpenAPIRegistry, RouteConfig } from "@asteasolutions/zod-to-openapi";

type Method = "get" | "post" | "put" | "delete";

// One route: the OpenAPI description plus what Express needs to serve it.
export type RouteDef = Omit<RouteConfig, "method"> & {
  method: Method;
  middleware?: RequestHandler[]; // e.g. an upload, validate(schema)
  // io is passed to every handler, the ones that don't emit events ignore it
  handler: (req: Request, res: Response, next: NextFunction, io: Server) => unknown;
};

export const defineRoute = (def: RouteDef) => def;

// OpenAPI writes /users/{userId}, Express wants /users/:userId
const toExpressPath = (path: string) => path.replace(/\{(\w+)\}/g, ":$1");

export function mountRoutes(router: Router, routes: RouteDef[], io: Server) {
  for (const { method, path, middleware = [], handler } of routes) {
    router[method](toExpressPath(path), ...middleware, (req, res, next) => handler(req, res, next, io));
  }
}

export function registerRoutes(registry: OpenAPIRegistry, routes: RouteDef[]) {
  for (const { middleware, handler, ...doc } of routes) registry.registerPath(doc);
}
