import { z } from "zod";
import { id, dateTime, binary } from "./common.js";

export const chatParams = z.object({ chatId: id });
export const messageParams = chatParams.extend({ messageId: id });

export const message = z.object({
  id,
  content: z.string().nullable(),
  photoUrl: z.string().nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  authorId: id.nullable(),
  groupId: id,
});

// multipart/form-data sends every field as a string
export const createMessageBody = z.object({
  content: z.string().optional(),
  groupId: z.string().describe("Group id, as a number in a string"),
  authorId: z.string().describe("Author's user id, as a number in a string"),
  photoUrl: binary.optional().describe("Image file"),
});
export const updateMessageBody = z.object({ content: z.string() });
