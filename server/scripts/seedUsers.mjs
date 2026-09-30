import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const responderPassword = await bcrypt.hash('emergency123', 10);
  const communityPassword = await bcrypt.hash('community123', 10);

  const responder = await prisma.user.upsert({
    where: { badgeId: 'FR001' },
    update: {
      name: 'Officer Johnson',
      email: 'fr001@crisisconnect.local',
      password: responderPassword,
      role: 'first-responder',
    },
    create: {
      name: 'Officer Johnson',
      email: 'fr001@crisisconnect.local',
      password: responderPassword,
      role: 'first-responder',
      badgeId: 'FR001',
    },
  });

  const communityUser = await prisma.user.upsert({
    where: { email: 'community@crisisconnect.local' },
    update: {
      name: 'Alex Rivera',
      password: communityPassword,
      role: 'user',
      badgeId: null,
    },
    create: {
      name: 'Alex Rivera',
      email: 'community@crisisconnect.local',
      password: communityPassword,
      role: 'user',
    },
  });

  console.log('Seeded responder:', responder.email);
  console.log('Seeded community user:', communityUser.email);

  // Admin accounts are only created when a password is supplied explicitly
  if (process.env.SEED_ADMIN_PASSWORD) {
    const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@crisisconnect.local' },
      update: { password: adminPassword, role: 'admin' },
      create: {
        name: 'Admin',
        email: 'admin@crisisconnect.local',
        password: adminPassword,
        role: 'admin',
      },
    });
    console.log('Seeded admin:', admin.email);
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed users', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
