import { notFound } from 'next/navigation'
import Link from 'next/link'
import { verifySession, getCurrentProfile } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { DocumentActions } from '@/components/documents/document-actions'
import { formatCurrencyEUR, formatNumber } from '@/lib/calc'

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

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await verifySession()

  const doc = await prisma.document.findFirst({
    where: { id, userId },
    include: {
      client: true,
      lines: { orderBy: { order: 'asc' } },
      creditFrom: { select: { number: true } },
    },
  })
  if (!doc) notFound()

  const profile = await getCurrentProfile()

  // Récap TVA par taux
  const byRate = new Map<number, { baseHT: number; tva: number }>()
  for (const l of doc.lines) {
    const r = Number(l.vatRate)
    const cur = byRate.get(r) ?? { baseHT: 0, tva: 0 }
    cur.baseHT += Number(l.lineHT)
    cur.tva += Number(l.lineTVA)
    byRate.set(r, cur)
  }
  const vatRecap = Array.from(byRate.entries()).sort((a, b) => a[0] - b[0])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/documents" className="text-sm text-muted hover:text-foreground">
          ← Retour aux documents
        </Link>
      </div>

      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">
            {TYPE_LABELS[doc.type]} · {STATUS_LABELS[doc.status]}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight font-mono">
            {doc.number ?? 'Brouillon'}
          </h1>
          {doc.subject && <p className="mt-1 text-sm text-muted">Objet : {doc.subject}</p>}
          <div className="mt-2 text-sm text-muted space-x-4">
            {doc.issueDate && (
              <span>Émise le {new Intl.DateTimeFormat('fr-FR').format(new Date(doc.issueDate))}</span>
            )}
            {doc.dueDate && (
              <span>Échéance : {new Intl.DateTimeFormat('fr-FR').format(new Date(doc.dueDate))}</span>
            )}
          </div>
        </div>
        <DocumentActions
          doc={{
            id: doc.id,
            type: doc.type,
            status: doc.status,
            number: doc.number,
          }}
        />
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Émetteur">
          {profile ? (
            <dl className="text-sm space-y-1">
              <dt className="font-medium">{profile.displayName || profile.legalName}</dt>
              <dd className="text-muted">{profile.legalName} · {profile.legalForm}</dd>
              <dd className="text-muted">SIRET {profile.siret}</dd>
              {profile.tvaIntra && <dd className="text-muted">TVA {profile.tvaIntra}</dd>}
              <dd className="text-muted">
                {profile.addressStreet}, {profile.addressZip} {profile.addressCity}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-red-500">Profil incomplet — complétez-le pour émettre.</p>
          )}
        </Card>
        <Card title="Destinataire">
          <dl className="text-sm space-y-1">
            <dt className="font-medium">{doc.client.companyName}</dt>
            {doc.client.contactName && <dd className="text-muted">{doc.client.contactName}</dd>}
            <dd className="text-muted">SIRET {doc.client.siret}</dd>
            <dd className="text-muted">
              {doc.client.addressStreet}, {doc.client.addressZip} {doc.client.addressCity}
            </dd>
            <dd className="text-muted">{doc.client.email}</dd>
          </dl>
        </Card>
      </div>

      <Card title="Lignes de prestation">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-border">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium text-right">Qté</th>
              <th className="py-2 font-medium text-right">P.U. HT</th>
              <th className="py-2 font-medium text-right">TVA %</th>
              <th className="py-2 font-medium text-right">Total HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.lines.map((l) => (
              <tr key={l.id}>
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{formatNumber(Number(l.quantity), 3)}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrencyEUR(Number(l.unitPriceHT))}</td>
                <td className="py-2 text-right tabular-nums">{formatNumber(Number(l.vatRate))}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrencyEUR(Number(l.lineHT))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium mb-2">Récapitulatif TVA</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr className="border-b border-border">
                  <th className="py-1 font-medium">Taux</th>
                  <th className="py-1 font-medium text-right">Base HT</th>
                  <th className="py-1 font-medium text-right">TVA</th>
                </tr>
              </thead>
              <tbody>
                {vatRecap.map(([rate, v]) => (
                  <tr key={rate}>
                    <td className="py-1 tabular-nums">{formatNumber(rate)} %</td>
                    <td className="py-1 text-right tabular-nums">{formatCurrencyEUR(v.baseHT)}</td>
                    <td className="py-1 text-right tabular-nums">{formatCurrencyEUR(v.tva)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto w-64 space-y-1 text-sm">
            <Line label="Total HT" value={formatCurrencyEUR(Number(doc.totalHT))} />
            <Line label="Total TVA" value={formatCurrencyEUR(Number(doc.totalTVA))} />
            <Line label="Total TTC" value={formatCurrencyEUR(Number(doc.totalTTC))} strong />
          </div>
        </div>
      </Card>

      {doc.status !== 'DRAFT' && (
        <div className="flex gap-3">
          <a href={`/api/documents/${doc.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Télécharger le PDF</Button>
          </a>
        </div>
      )}

      {doc.footerNote && (
        <Card title="Mention en pied">
          <p className="text-sm text-muted whitespace-pre-line">{doc.footerNote}</p>
        </Card>
      )}

      {doc.type === 'CREDIT' && doc.creditFrom?.number && (
        <p className="text-sm text-muted">
          Avoir relatif à la facture {doc.creditFrom.number}.
        </p>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold' : 'text-muted'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}