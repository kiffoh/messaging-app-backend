import { z } from "zod";
import { validate } from "./validate.js";

const bio = z.string().trim().max(200, "Bio must be a maximum of 200 characters.");
const groupName = z.string().trim().max(20, "Group name must be a maximum of 20 characters.");

export const groupSchema = z.object({ name: groupName.optional(), bio: bio.optional() });

export const validateGroup = validate(groupSchema);
