import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const id = z.number().int();
// Path params arrive as strings, so they need coercing
export const idParam = z.coerce.number().int().positive();
// A list of ids, or the JSON string of one (multipart forms can't send arrays)
export const idList = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return v; } // left as a string, z.array rejects it with a 400
  },
  z.array(idParam),
);
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
