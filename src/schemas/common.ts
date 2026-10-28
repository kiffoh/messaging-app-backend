import { z } from "zod";
import "../middleware/validation.js"; // extends zod with .openapi()

export const id = z.number().int();
export const dateTime = z.iso.datetime();
export const binary = z.string().openapi({ format: "binary" });

// The API answers errors in a few different shapes, documented as they are today.
export const messageOnly = z.object({ message: z.string() });
export const statusAndMessage = z.object({ status: z.literal("error"), message: z.string() });
export const errorOnly = z.object({ error: z.string() });
export const validationError = z.object({
  status: z.literal("error"),
  errors: z.array(z.object({ field: z.string(), message: z.string() })),
});

export const jsonBody = (schema: z.ZodType) => ({ content: { "application/json": { schema } } });
export const formBody = (schema: z.ZodType) => ({ content: { "multipart/form-data": { schema } } });
export const jsonResponse = (description: string, schema: z.ZodType) => ({
  description,
  content: { "application/json": { schema } },
});
export const textResponse = (description: string) => ({
  description,
  content: { "text/plain": { schema: z.string() } },
});

export const badRequest = jsonResponse("Validation failed", validationError);
