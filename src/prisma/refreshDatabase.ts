import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.message.deleteMany({})
    await prisma.group.deleteMany({})
    await prisma.user.deleteMany({})
    console.log('Fake data deleted successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


