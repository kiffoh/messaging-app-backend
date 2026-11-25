import { it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { handleError } from "../../src/middleware/error.js";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../src/lib/errors.js";

it.each([
  [BadRequestError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
])("maps %o to its status with { message }", (ErrorClass, status) => {
  const json = vi.fn();
  const res = { headersSent: false, status: vi.fn(() => ({ json })) } as unknown as Response;
  handleError(new ErrorClass("boom"), {} as Request, res, vi.fn());
  expect(res.status).toHaveBeenCalledWith(status);
  expect(json).toHaveBeenCalledWith({ message: "boom" });
});
