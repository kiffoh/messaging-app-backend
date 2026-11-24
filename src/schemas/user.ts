import { z } from "zod";
import { id, idParam, dateTime } from "../lib/schemas.js";

export const userIdParams = z.object({ userId: idParam });

// Request bodies.
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

