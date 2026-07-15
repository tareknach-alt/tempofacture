import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'
import { pool } from '@/lib/pg'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createPrisma() {
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = createPrisma())