// Recreates the demo "guest" account (contacts, groups, DMs, messages) from the live site.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data = JSON.parse(readFileSync(path.join(import.meta.dirname, 'guestSeedData.json'), 'utf8'));

// The other demo users get a shared dev password; only guest matches the live site.
const passwords: Record<string, string> = { guest: 'iamaguest' };
const defaultPassword = 'password123';

async function main() {
  if (await prisma.user.findUnique({ where: { username: 'guest' } })) {
    console.log('guest already exists, run `npm run db:reset` first to re-seed');
    return;
  }

  const hashes: Record<string, string> = {};
  for (const { username } of data.users) {
    hashes[username] = await bcrypt.hash(passwords[username] ?? defaultPassword, 10);
  }

  // All or nothing, so a failed run doesn't leave a half-created guest behind
  await prisma.$transaction(async (tx) => {
    for (const u of data.users) {
      await tx.user.create({ data: { ...u, password: hashes[u.username] } });
    }

    await tx.user.update({
      where: { username: 'guest' },
      data: { contacts: { connect: data.contacts.map((username: string) => ({ username })) } },
    });

    for (const { members, admins, messages, ...group } of data.groups) {
      const created = await tx.group.create({
        data: {
          ...group,
          members: { connect: members.map((username: string) => ({ username })) },
          admins: { connect: admins.map((username: string) => ({ username })) },
        },
      });
      for (const { author, ...message } of messages) {
        await tx.message.create({
          data: { ...message, group: { connect: { id: created.id } }, author: { connect: { username: author } } },
        });
      }
    }
  }, { timeout: 30000 });

  console.log('Guest demo data created (log in as guest / iamaguest)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
