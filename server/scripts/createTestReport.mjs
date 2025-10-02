import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_REPORTER_EMAIL = process.env.DEFAULT_REPORT_EMAIL || 'anonymous@crisisconnect.local';
const DEFAULT_REPORTER_NAME = process.env.DEFAULT_REPORT_NAME || 'Offline Reporter';
const DEFAULT_REPORTER_PASSWORD_HASH = bcrypt.hashSync(process.env.DEFAULT_REPORT_PASSWORD || 'offline-reporter', 10);

async function ensureDefaultReporter() {
  const reporter = await prisma.user.upsert({
    where: { email: DEFAULT_REPORTER_EMAIL },
    update: {},
    create: {
      name: DEFAULT_REPORTER_NAME,
      email: DEFAULT_REPORTER_EMAIL,
      password: DEFAULT_REPORTER_PASSWORD_HASH,
      role: 'user',
    },
  });
  return reporter.id;
}

async function main() {
  const userId = await ensureDefaultReporter();
  const report = await prisma.report.create({
    data: {
      description: 'Test offline report',
      location: 'Test location',
      status: 'medical',
      userId,
    },
  });
  console.log(report);
}

main().catch((error) => {
  console.error(error);
}).finally(async () => {
  await prisma.$disconnect();
});
