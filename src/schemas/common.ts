import { codec, z } from "zod";
import "../middleware/validation.js"; // extends zod with .openapi()

export const id = z.number().int();
export const dateTime = z.iso.datetime();
export const binary = z.string().openapi({ format: "binary" });

// Every error body is { message }, validation failures also list the offending fields.
export const messageOnly = z.object({ message: z.string() });
export const validationError = z.object({
  message: z.string(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })),
});

export const jsonBody = (schema: z.ZodType) => ({ content: { "application/json": { schema } } });
export const formBody = (schema: z.ZodType) => ({ content: { "multipart/form-data": { schema } } });
export const jsonResponse = (description: string, schema: z.ZodType) => ({
  description,
  content: { "application/json": { schema } },
});
export const badRequest = jsonResponse("Validation failed", validationError);
