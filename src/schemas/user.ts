import { z } from "zod";
import { id, dateTime } from "./common.js";
import { userSignUpSchema } from "../middleware/validation.js";

export const userIdParams = z.object({ userId: id });

// Request bodies. The validators only check lengths, the controllers also need these fields.
export const signUpBody = userSignUpSchema.required({ username: true }).extend({ password: z.string() });
export const logInBody = z.object({ username: z.string(), password: z.string() });
export const contactsBody = z.object({ selectedContacts: z.array(id) });

// A row from the User table.
// shortcut: the API returns the bcrypt hash too, remove `password` here once the controllers stop sending it
export const user = z.object({
  id,
  username: z.string(),
  password: z.string().describe("bcrypt hash, currently returned by the API"),
  bio: z.string().nullable(),
  createdAt: dateTime,
  photo: z.string().nullable(),
});

// The controllers add a formatted copy of createdAt.
const formattedDate = {
  createdAtDate: z.string().describe("dd-mm-yyyy (UTC)"),
  createdAtTime: z.string().describe("hh:mm (UTC)"),
};

export const userWithContacts = user.extend({ contacts: z.array(user), ...formattedDate });
export const userWithContactsAndFollowers = userWithContacts.extend({ contactedBy: z.array(user) });

export const userSummary = z.object({ id, username: z.string(), photo: z.string() });

export const signUpResult = z.object({ user, token: z.string().describe("JWT, expires in 1 hour") });
export const logInResult = z.object({ token: z.string().describe("JWT, expires in 1 hour"), message: z.string() });
