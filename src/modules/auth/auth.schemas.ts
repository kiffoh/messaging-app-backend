import { z } from "zod";
import { id, dateTime } from "../../lib/schemas.js";

export const signUpBody = z.object({
  username: z.string().trim().min(1, "Username is required.").max(10, "Username must be a maximum of 10 characters."),
  password: z.string().min(1, "Password is required."),
});
export const logInBody = z.object({ username: z.string(), password: z.string() });

const user = z.object({
  id,
  username: z.string(),
  bio: z.string().nullable(),
  photo: z.string().nullable(),
  createdAt: dateTime,
});
export const authResult = z.object({ token: z.string().describe("JWT, expires in 1 hour"), user });
