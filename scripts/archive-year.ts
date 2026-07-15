/**
 * Export annuel des factures au format JSON pour archivage légal.
 *
 * Usage : npx tsx scripts/archive-year.ts 2026
 *
 * La conservation légale des factures est de 10 ans (art. L123-22
 * Code de commerce ; art. 1029 CGI). Cet export est complémentaire
 * de la base PostgreSQL (qui elle-même ne supprime jamais).
 */
import 'dotenv/config'
import fs from 'node:fs'
import { prisma } from '../src/lib/db'
import { pool } from '../src/lib/pg'

async function main() {
  const year = Number(process.argv[2] ?? new Date().getFullYear())
  if (Number.isNaN(year)) {
    console.error('Année invalide')
    process.exit(1)
  }

  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))

  const docs = await prisma.document.findMany({
    where: {
      type: { in: ['INVOICE', 'CREDIT'] },
      status: { not: 'DRAFT' },
      issueDate: { gte: start, lt: end },
    },
    include: {
      client: true,
      lines: { orderBy: { order: 'asc' } },
      creditFrom: { select: { number: true } },
    },
    orderBy: { issueDate: 'asc' },
  })

  const serializable = docs.map((d) => ({
    id: d.id,
    number: d.number,
    type: d.type,
    status: d.status,
    issueDate: d.issueDate?.toISOString(),
    dueDate: d.dueDate?.toISOString(),
    subject: d.subject,
    paymentTermsDays: d.paymentTermsDays,
    totalHT: Number(d.totalHT),
    totalTVA: Number(d.totalTVA),
    totalTTC: Number(d.totalTTC),
    client: {
      companyName: d.client.companyName,
      siret: d.client.siret,
      tvaIntra: d.client.tvaIntra,
      address: `${d.client.addressStreet}, ${d.client.addressZip} ${d.client.addressCity}`,
    },
    lines: d.lines.map((l) => ({
      order: l.order,
      description: l.description,
      quantity: Number(l.quantity),
      unitPriceHT: Number(l.unitPriceHT),
      vatRate: Number(l.vatRate),
      lineHT: Number(l.lineHT),
      lineTVA: Number(l.lineTVA),
      lineTTC: Number(l.lineTTC),
    })),
    creditFrom: d.creditFrom?.number ?? null,
  }))

  const file = `archive-${year}.json`
  fs.writeFileSync(file, JSON.stringify(serializable, null, 2), 'utf8')
  console.log(`Archivage ${year} : ${docs.length} document(s) → ${file}`)
}

main().catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })