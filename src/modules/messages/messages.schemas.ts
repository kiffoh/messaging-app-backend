import { z } from "zod";
import { id, idParam, dateTime, binary } from "../../lib/schemas.js";

export const groupParams = z.object({ groupId: idParam });
export const messageParams = groupParams.extend({ messageId: idParam });

export const message = z.object({
  id,
  content: z.string().nullable(),
  photoUrl: z.string().nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  authorId: id.nullable(),
  groupId: id,
});

export const createMessageBody = z.object({ content: z.string().trim().optional() });
export const createMessageForm = createMessageBody.extend({ photo: binary.optional().describe("Image file") });
export const updateMessageBody = z.object({ content: z.string().trim().min(1, "A message cannot be blank.") });
