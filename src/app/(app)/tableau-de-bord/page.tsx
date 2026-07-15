import Link from 'next/link'
import { getCurrentProfile, verifySession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { formatCurrencyEUR } from '@/lib/calc'
import { refreshLateStatuses } from '@/actions/cron'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { userId } = await verifySession()
  const profile = await getCurrentProfile()
  if (!profile) return <ProfileIncomplete />

  // Bascule automatique des factures émises en retard
  await refreshLateStatuses().catch(() => ({}))

  const clientCount = await prisma.client.count({ where: { userId } })

  // Agrégats factures
  const now = new Date()
  const invoices = await prisma.document.findMany({
    where: { userId, type: 'INVOICE', status: { not: 'DRAFT' } },
    select: { id: true, totalHT: true, totalTTC: true, status: true, dueDate: true },
  })

  let caHT = 0 // total factures émises non payées et non annulées (en cours)
  let pendingTTC = 0 // montants en attente de paiement
  let lateTTC = 0 // montants en retard

  for (const inv of invoices) {
    if (inv.status === 'CANCELLED') continue
    if (inv.status === 'PAID') continue
    caHT += Number(inv.totalHT)
    pendingTTC += Number(inv.totalTTC)
    if (inv.dueDate && new Date(inv.dueDate) < now) {
      lateTTC += Number(inv.totalTTC)
    }
  }

  // Factures individuelles en retard (pour la liste)
  const lateInvoices = await prisma.document.findMany({
    where: {
      userId,
      type: 'INVOICE',
      status: 'ISSUED',
      dueDate: { lt: now },
    },
    include: { client: { select: { companyName: true } } },
    orderBy: { dueDate: 'asc' },
    take: 5,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted">
          Vue d&rsquo;ensemble de votre activité de formation et coaching.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Clients enregistrés" value={String(clientCount)} />
        <Stat label="CA HT en cours" value={formatCurrencyEUR(caHT)} />
        <Stat label="En attente de paiement" value={formatCurrencyEUR(pendingTTC)} accent="blue" />
        <Stat label="Factures en retard" value={formatCurrencyEUR(lateTTC)} accent="red" />
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Factures en retard</h2>
          <Link href="/documents">
            <Button variant="ghost">Voir tous les documents →</Button>
          </Link>
        </div>

        {lateInvoices.length === 0 ? (
          <p className="text-sm text-muted">Aucune facture en retard. 👍</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted border-b border-border">
              <tr>
                <th className="py-2 font-medium">N°</th>
                <th className="py-2 font-medium">Client</th>
                <th className="py-2 font-medium">Échéance</th>
                <th className="py-2 font-medium text-right">Total TTC</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lateInvoices.map((inv) => {
                const daysLate = Math.floor(
                  (now.getTime() - new Date(inv.dueDate!).getTime()) / (24 * 60 * 60 * 1000),
                )
                return (
                  <tr key={inv.id}>
                    <td className="py-3 font-mono text-xs">{inv.number}</td>
                    <td className="py-3">{inv.client.companyName}</td>
                    <td className="py-3 text-red-600 dark:text-red-400">
                      {new Intl.DateTimeFormat('fr-FR').format(new Date(inv.dueDate!))}
                      <span className="ml-1 text-xs">(+{daysLate} j)</span>
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatCurrencyEUR(Number(inv.totalTTC))}
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/relancer/${inv.id}`}>
                        <Button variant="secondary">Relancer</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'blue' | 'red'
}) {
  const accentClass =
    accent === 'red'
      ? 'text-red-600 dark:text-red-400'
      : accent === 'blue'
        ? 'text-blue-600 dark:text-blue-400'
        : ''
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accentClass}`}>{value}</p>
    </div>
  )
}

function ProfileIncomplete() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="font-medium text-amber-600 dark:text-amber-400">
          Profil freelance incomplet
        </h2>
        <p className="mt-1 text-sm text-muted">
          Renseignez vos coordonnées et mentions légales pour pouvoir émettre des
          documents conformes.
        </p>
        <Link href="/profil">
          <Button className="mt-4">Compléter mon profil</Button>
        </Link>
      </div>
    </div>
  )
}