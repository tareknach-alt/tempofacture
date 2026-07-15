#!/usr/bin/env npx tsx
/**
 * Cron quotidien : détection des factures en retard.
 *
 * À exécuter chaque jour (ex. via Vercel Cron, systemd timer, ou cron unix) :
 *   0 8 * * *  cd /path/to/project && npx tsx scripts/cron-detect-late.ts >> /tmp/cron.log 2>&1
 *
 * Le script parcourt toutes les factures émises (status ISSUED) dont l'échéance
 * est dépassée et les bascule en statut LATE. Aucune session n'est nécessaire.
 */
import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { pool } from '../src/lib/pg'

async function main() {
  const now = new Date()
  const res = await prisma.document.updateMany({
    where: {
      type: 'INVOICE',
      status: 'ISSUED',
      dueDate: { lt: now },
    },
    data: { status: 'LATE' },
  })

  console.log(
    `[${now.toISOString()}] Factures passées en retard : ${res.count}`,
  )
}

main()
  .catch((e) => {
    console.error('Erreur cron :', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })