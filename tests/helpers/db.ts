import { PrismaClient } from "@prisma/client";

export async function resetDb(): Promise<void> {
  if (!process.env.DATABASE_URL?.includes("messaging_app_test")) {
    throw new Error("Refusing to reset a non-test database");
  }
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('TRUNCATE "Message","Group","User" RESTART IDENTITY CASCADE');
  } finally {
    await prisma.$disconnect();
  }
}
