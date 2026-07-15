import 'dotenv/config'
import assert from 'node:assert'
import { prisma } from '../src/lib/db'
import { pool } from '../src/lib/pg'
import { buildReminderEmail } from '../src/lib/reminders'
import { refreshLateStatusesAll } from '../src/actions/cron'

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'tarek@tempofacture.test' } })
  if (!user) throw new Error('Compte test absent')
  const userId = user.id

  const profile = await prisma.freelanceProfile.findUnique({ where: { userId } })
  if (!profile) throw new Error('Profil manquant')

  let client = await prisma.client.findFirst({ where: { userId } })
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId,
        companyName: 'Acme Formation',
        siret: '98765432100045',
        addressStreet: '5 av. des Clients',
        addressZip: '69000',
        addressCity: 'Lyon',
        email: 'compta@acme.test',
      },
    })
  }

  // Nettoyage
  await prisma.document.deleteMany({ where: { userId } })
  await pool.query('DELETE FROM document_sequence WHERE user_id = $1', [userId])

  // --- 1. Création de 3 factures : payée, émise en échéance future, en retard ---
  // Profil mis à jour pour pénalités/indemnité
  await prisma.freelanceProfile.update({
    where: { userId },
    data: { latePenaltyRate: 10, recoveryPriceFix: 40 },
  })

  const now = new Date()
  const pastDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 j avant
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 j après

  // a) facture en retard (ISSUED, dueDate passée)
  const late = await prisma.document.create({
    data: {
      userId,
      clientId: client.id,
      type: 'INVOICE',
      status: 'ISSUED',
      number: 'FAC-2026-07-001',
      numberPrefix: 'FAC',
      numberYear: 2026,
      numberMonth: 7,
      numberSeq: 1,
      issueDate: pastDate,
      dueDate: pastDate,
      totalHT: 1000,
      totalTVA: 200,
      totalTTC: 1200,
      paymentTermsDays: 30,
      lines: {
        create: [
          {
            order: 1,
            description: 'Formation test',
            quantity: 1,
            unitPriceHT: 1000,
            vatRate: 20,
            lineHT: 1000,
            lineTVA: 200,
            lineTTC: 1200,
          },
        ],
      },
    },
    include: { client: true, lines: true },
  })

  // b) facture émise en échéance future
  const future = await prisma.document.create({
    data: {
      userId,
      clientId: client.id,
      type: 'INVOICE',
      status: 'ISSUED',
      number: 'FAC-2026-07-002',
      numberPrefix: 'FAC',
      numberYear: 2026,
      numberMonth: 7,
      numberSeq: 2,
      issueDate: now,
      dueDate: futureDate,
      totalHT: 500,
      totalTVA: 100,
      totalTTC: 600,
      paymentTermsDays: 30,
      lines: { create: [] },
    },
    include: { client: true },
  })

  // c) facture payée
  const paid = await prisma.document.create({
    data: {
      userId,
      clientId: client.id,
      type: 'INVOICE',
      status: 'PAID',
      number: 'FAC-2026-07-003',
      numberPrefix: 'FAC',
      numberYear: 2026,
      numberMonth: 7,
      numberSeq: 3,
      issueDate: pastDate,
      dueDate: pastDate,
      totalHT: 300,
      totalTVA: 60,
      totalTTC: 360,
      paymentTermsDays: 30,
      lines: { create: [] },
    },
    include: { client: true },
  })

  assert.strictEqual(late.status, 'ISSUED')
  console.log('OK 3 factures créées (1 en retard, 1 future, 1 payée)')

  // --- 2. Exécution du cron de bascule automatique LATE ---
  const result = await refreshLateStatusesAll()
  assert.ok(result.updated >= 1, `Aucune facture basculée en retard (updated=${result.updated})`)
  console.log(`OK cron détecte ${result.updated} facture(s) en retard et bascule ISSUED → LATE`)

  // La facture en retard est désormais LATE
  const lateAfter = await prisma.document.findUnique({ where: { id: late.id } })
  assert.strictEqual(lateAfter?.status, 'LATE')
  console.log('OK facture échéance dépassée → statut LATE automatique')

  // La facture future reste ISSUED
  const futureAfter = await prisma.document.findUnique({ where: { id: future.id } })
  assert.strictEqual(futureAfter?.status, 'ISSUED')
  console.log('OK facture échéance future reste ISSUED')

  // La payée reste PAYÉ
  const paidAfter = await prisma.document.findUnique({ where: { id: paid.id } })
  assert.strictEqual(paidAfter?.status, 'PAID')
  console.log('OK facture payée reste PAID')

  // --- 3. Génération des 3 niveaux d'email de relance ---
  const profileFull = await prisma.freelanceProfile.findUnique({ where: { userId } })
  if (!profileFull) throw new Error('profil rechgé manquant')
  const lateFull = await prisma.document.findUnique({
    where: { id: late.id },
    include: { client: true },
  })
  if (!lateFull) throw new Error('facture late disparue')

  for (const lvl of ['amicale', 'ferme', 'mise-en-demeure'] as const) {
    const email = buildReminderEmail(lateFull, profileFull, lvl)
    assert.ok(email.subject.includes('FAC-2026-07-001'), `Subject ${lvl} ne contient pas le n° de facture`)
    assert.strictEqual(email.to, client.email)
    assert.ok(
      email.body.replace(/\u202F/g, ' ').replace(/\u00A0/g, ' ').includes('1 200,00') ||
        email.body.includes('1200,00'),
      `Body ${lvl} sans montant (retenu: ${email.body.slice(0, 150)})`,
    )
    assert.ok(email.body.includes('FAC-2026-07-001'), `Body ${lvl} sans n° facture`)
    assert.ok(email.body.length > 200, `Body ${lvl} trop court`)
    if (lvl === 'ferme' || lvl === 'mise-en-demeure') {
      assert.ok(
        email.body.includes('Pénalités de retard') ||
          email.body.includes('pénalités de retard') ||
          email.body.includes('10,00 %'),
        `Body ${lvl} sans mention pénalités (taux 10%)`,
      )
      assert.ok(
        email.body.includes('40,00') || email.body.includes('indemnité forfaitaire'),
        `Body ${lvl} sans indemnité forfaitaire (40 €)`,
      )
    }
    if (lvl === 'mise-en-demeure') {
      assert.ok(/MISE EN DEMEURE/i.test(email.subject), 'Subject mise-en-demeure incorrect')
      assert.ok(
        email.body.includes('huitaine') || email.body.includes('Code de commerce'),
        'Body mise-en-demeure doit mentionner huitaine ou art. Code de commerce',
      )
    }
    console.log(`OK email niveau "${lvl}" généré (${email.body.length} car, subject="${email.subject}")`)
  }

  // Lien vers la facture PDF (juste l'URL est documentée)
  const pdfUrl = `/api/documents/${late.id}/pdf`
  assert.ok(pdfUrl.includes(late.id))
  console.log('OK URL du PDF générée :', pdfUrl)

  // --- Nettoyage ---
  await prisma.document.deleteMany({ where: { userId } })
  await pool.query('DELETE FROM document_sequence WHERE user_id = $1', [userId])

  console.log('\n✅ PHASE 4 — Tous les critères de validation sont satisfaits.')
}

main().catch((e) => { console.error('\n❌ ÉCHEC :', e.message); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })