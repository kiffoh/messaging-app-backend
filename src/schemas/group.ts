import { z } from "zod";
import { id, idParam, dateTime, binary } from "../lib/schemas.js";
import { user } from "../modules/users/users.schemas.js";
import { groupSchema } from "../middleware/validation.js";
import { message } from "./message.js";

export const groupIdParams = z.object({ groupId: idParam });
export const userIdHeader = z.object({ "user-id": id.describe("Id of the user making the request") });

// Request bodies
export const directMessageBody = z.object({
  members: z.array(z.object({ id })).min(1).describe("The first member is the user starting the chat"),
});
export const createGroupBody = groupSchema.extend({
  members: z.string().describe('JSON array of { id, username }, e.g. [{"id":1,"username":"guest"}]. The first member becomes admin'),
  groupPhoto: binary.optional().describe("Image file"),
});
export const updateGroupBody = groupSchema.extend({ photo: binary.optional().describe("Image file") });

export const group = z.object({
  id,
  name: z.string().nullable().describe("null for unnamed groups, the API then derives a name from the members"),
  photo: z.string().nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  directMsg: z.boolean(),
  bio: z.string().nullable(),
});

export const groupWithMembers = group.extend({ members: z.array(user) });
export const groupWithMembersAndMessages = groupWithMembers.extend({ messages: z.array(message) });

export const groupProfile = groupWithMembers.extend({
  admins: z.array(user),
  createdAtDate: z.string().describe("dd-mm-yyyy (UTC)"),
  createdAtTime: z.string().describe("hh:mm (UTC)"),
});

export const existingGroupResult = z.object({ existingGroup: groupWithMembersAndMessages, message: z.string() });
export const newGroupResult = z.object({ newGroup: groupWithMembersAndMessages });
