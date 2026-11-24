import { z } from "zod";
import { id, idParam, idList, dateTime, binary } from "../../lib/schemas.js";
import { username } from "../auth/auth.schemas.js";

export const userIdParams = z.object({ userId: idParam });

export const updateUserBody = z.object({
  username: username.optional(),
  bio: z.string().trim().max(200, "Bio must be a maximum of 200 characters.").optional(),
});
export const updateUserForm = updateUserBody.extend({ photo: binary.optional().describe("Image file") });
export const contactsBody = z.object({ contactIds: idList });

export const user = z.object({
  id,
  username: z.string(),
  bio: z.string().nullable(),
  photo: z.string().nullable(),
  createdAt: dateTime,
});
export const userSummary = z.object({ id, username: z.string(), photo: z.string() });
export const userProfile = user.extend({
  contacts: z.array(user),
  createdAtDate: z.string().describe("dd-mm-yyyy (UTC)"),
  createdAtTime: z.string().describe("hh:mm (UTC)"),
});
