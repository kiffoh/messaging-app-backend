import { describe, it, expect, vi } from "vitest";
import { validateUser } from "../configuration/validation.js";

function run(body: unknown) {
  const req: any = { body };
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  validateUser(req, res, next);
  return { req, res, next };
}

describe("validate middleware", () => {
  it("returns 400 in the existing error shape", () => {
    const { res, next } = run({ username: "waytoolongname" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      errors: [{ field: "username", message: "Username must be a maximum of 10 characters." }],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("trims known fields and keeps unlisted ones", () => {
    const { req, next } = run({ username: "  kiff  ", password: "secret" });
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ username: "kiff", password: "secret" });
  });
});
