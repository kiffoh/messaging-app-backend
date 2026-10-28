import z from "zod";

export const environmentSchema = z.object({
  'DATABASE_URL': z.url(),
  'FRONTEND_URL': z.url(),
  'SECRET_KEY': z.string(),
  'DEFAULT_PICTURE': z.url(),
  'DEFAULT_GROUP_PICTURE': z.url(),
  'CLOUDINARY_CLOUD_NAME': z.string(),
  'CLOUDINARY_API_KEY': z.string(),
  'CLOUDINARY_API_SECRET': z.string(),
  'PORT': z.number().default(3000),
})

export const env = environmentSchema.parse(process.env);