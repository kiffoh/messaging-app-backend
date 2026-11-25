import { it, expect, vi } from "vitest";
import { discardUpload } from "../../src/middleware/upload.js";
import type { Request, Response } from "express";
import { handleError } from "../../src/middleware/error.js";
vi.mock("../../src/middleware/upload.js", () => ({ discardUpload: vi.fn() }));

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

it("discards the uploaded file and keeps the status", () => {
  const json = vi.fn();
  const res = { headersSent: false, status: vi.fn(() => ({ json })) } as unknown as Response;
  const file = { filename: "group_photos/x" };
  handleError(new NotFoundError("gone"), { file } as unknown as Request, res, vi.fn());
  expect(discardUpload).toHaveBeenCalledWith(file);
  expect(res.status).toHaveBeenCalledWith(404);
});
