import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const username = z.string().trim().max(10, "Username must be a maximum of 10 characters.");
const bio = z.string().trim().max(200, "Bio must be a maximum of 200 characters.");
const groupName = z.string().trim().max(20, "Group name must be a maximum of 20 characters.");

export const userSignUpSchema = z.object({ username: username.optional() });

export const userSchema = z.object({ username: username.optional(), bio: bio.optional() });

export const groupSchema = z.object({ name: groupName.optional(), bio: bio.optional() });

// Validates req.body and keeps the 400 response shape the client already expects.
// Parsed values (e.g. trimmed strings) are merged over the body, so fields the schema doesn't list survive.
export const validate = (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
  req.body = { ...req.body, ...(schema.parse(req.body ?? {}) as object) };
  next();
};

export const validateUserSignUp = validate(userSignUpSchema);
export const validateUser = validate(userSchema);
export const validateGroup = validate(groupSchema);
