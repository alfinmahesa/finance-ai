import { PrismaClient } from '@prisma/client';

// Pola singleton standar Next.js + Prisma — mencegah multiple koneksi DB
// setiap hot-reload saat development.

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
