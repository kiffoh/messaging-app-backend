import { z } from "zod";
import { id, idParam, idList, dateTime, binary } from "../../lib/schemas.js";
import { user } from "../users/users.schemas.js";
import { message } from "../messages/messages.schemas.js";

export const groupIdParams = z.object({ groupId: idParam });

const name = z.string().trim().max(20, "Group name must be a maximum of 20 characters.");
const bio = z.string().trim().max(200, "Bio must be a maximum of 200 characters.");
// z.coerce.boolean() would turn the multipart string "false" into true
const bool = z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean());

export const updateGroupBody = z.object({ name: name.min(1, "Group name cannot be blank.").optional(), bio: bio.optional() });
export const updateGroupForm = updateGroupBody.extend({ photo: binary.optional().describe("Image file") });
export const createGroupBody = updateGroupBody.extend({ name: name.optional(), memberIds: idList, directMsg: bool });
export const createGroupForm = createGroupBody.extend({
  memberIds: z.string().describe("JSON array of user ids, e.g. [2,3] (an array when sent as JSON)"),
  directMsg: z.string().describe('"true" or "false" (a boolean when sent as JSON)'),
  photo: binary.optional().describe("Image file"),
});

export const group = z.object({
  id,
  name: z.string().nullable(),
  photo: z.string().nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  directMsg: z.boolean(),
  bio: z.string().nullable(),
});
export const chatListItem = group.extend({ members: z.array(user), messages: z.array(message) });
export const groupProfile = group.extend({
  members: z.array(user),
  admins: z.array(user),
  createdAtDate: z.string().describe("dd-mm-yyyy (UTC)"),
  createdAtTime: z.string().describe("hh:mm (UTC)"),
});
