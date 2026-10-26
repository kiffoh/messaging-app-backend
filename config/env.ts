const required = [
  'DATABASE_URL',
  'FRONTEND_URL',
  'SECRET_KEY',
  'DEFAULT_PICTURE',
  'DEFAULT_GROUP_PICTURE',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

export const env = Object.fromEntries(required.map((k) => [k, process.env[k]])) as Record<
  (typeof required)[number],
  string
>;
