import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { ReminderComposer } from '@/components/documents/reminder-composer'

export const dynamic = 'force-dynamic'

export default async function RelancerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await verifySession()

  const doc = await prisma.document.findFirst({
    where: { id, userId, type: 'INVOICE' },
    include: { client: true },
  })
  if (!doc) notFound()

  if (doc.status !== 'LATE' && doc.status !== 'ISSUED') {
    return (
      <div className="space-y-6">
        <Link href="/documents" className="text-sm text-muted hover:text-foreground">
          ← Retour
        </Link>
        <p className="text-sm text-muted">
          La relance n&rsquo;est disponible que pour une facture émise ou en retard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/documents/${id}`} className="text-sm text-muted hover:text-foreground">
          ← Retour à la facture
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Relancer {doc.client.companyName}
        </h1>
      </div>

      <ReminderComposer
        invoiceId={doc.id}
        clientEmail={doc.client.email}
      />

      <div className="rounded-xl border border-border bg-card p-5 text-sm">
        <p className="font-medium mb-1">Facture à joindre :</p>
        <p className="text-muted">
          Téléchargez le PDF de la facture{' '}
          <a
            href={`/api/documents/${doc.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            {doc.number} →
          </a>{' '}
          et joignez-le à votre email avant l&rsquo;envoi.
        </p>
      </div>
    </div>
  )
}