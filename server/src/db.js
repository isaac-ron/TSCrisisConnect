import { PrismaClient } from '@prisma/client';

// One client (and connection pool) for the whole process
export const prisma = new PrismaClient();
