import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { formatCurrencyEUR } from '@/lib/calc'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  QUOTE: 'Devis',
  INVOICE: 'Facture',
  CREDIT: 'Avoir',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  PAID: 'Payée',
  LATE: 'En retard',
  CANCELLED: 'Annulée',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'text-muted',
  ISSUED: 'text-blue-600',
  PAID: 'text-emerald-600',
  LATE: 'text-red-600',
  CANCELLED: 'text-muted',
}

export default async function DocumentsPage() {
  const { userId } = await verifySession()
  const docs = await prisma.document.findMany({
    where: { userId },
    include: { client: { select: { companyName: true } } },
    orderBy: [{ createdAt: 'desc' }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted">Devis, factures et avoirs.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/documents/new?type=QUOTE">
            <Button variant="secondary">+ Devis</Button>
          </Link>
          <Link href="/documents/new?type=INVOICE">
            <Button>+ Facture</Button>
          </Link>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted">Aucun document pour le moment.</p>
          <Link href="/documents/new">
            <Button className="mt-4">Créer votre premier devis</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-border/20 text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium text-right">Total TTC</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Émise le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-border/10">
                  <td className="px-4 py-3 font-mono text-xs tabular-nums">{d.number ?? '—'}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[d.type]}</td>
                  <td className="px-4 py-3">{d.client.companyName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrencyEUR(Number(d.totalTTC))}</td>
                  <td className={`px-4 py-3 ${STATUS_COLOR[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {d.issueDate
                      ? new Intl.DateTimeFormat('fr-FR').format(new Date(d.issueDate))
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/documents/${d.id}`}>
                      <Button variant="secondary">Ouvrir</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}