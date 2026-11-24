import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

// Validates req.body and keeps the 400 response shape the client already expects.
// Parsed values (e.g. trimmed strings) are merged over the body, so fields the schema doesn't list survive.
export const validate = (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
  req.body = { ...req.body, ...(schema.parse(req.body ?? {}) as object) };
  next();
};
