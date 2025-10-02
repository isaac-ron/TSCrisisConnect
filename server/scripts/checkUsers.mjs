import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(users);
}

main().catch((error) => {
  console.error(error);
}).finally(async () => {
  await prisma.$disconnect();
});
