import { z } from "zod";
import { validate } from "./validate.js";

const username = z.string().trim().max(10, "Username must be a maximum of 10 characters.");
const bio = z.string().trim().max(200, "Bio must be a maximum of 200 characters.");
const groupName = z.string().trim().max(20, "Group name must be a maximum of 20 characters.");

export const userSignUpSchema = z.object({ username: username.optional() });

export const userSchema = z.object({ username: username.optional(), bio: bio.optional() });

export const groupSchema = z.object({ name: groupName.optional(), bio: bio.optional() });

export const validateUserSignUp = validate(userSignUpSchema);
export const validateUser = validate(userSchema);
export const validateGroup = validate(groupSchema);
