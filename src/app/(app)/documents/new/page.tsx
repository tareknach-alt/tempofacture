import Link from 'next/link'
import { verifySession, getCurrentProfile } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { DocumentForm } from '@/components/documents/document-form'
import { createDocument } from '@/actions/documents'

export const metadata = { title: 'Nouveau document — Tempofacture' }

export const dynamic = 'force-dynamic'

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: 'QUOTE' | 'INVOICE' }>
}) {
  const { type } = await searchParams
  const { userId } = await verifySession()
  const profile = await getCurrentProfile()

  const clients = await prisma.client.findMany({
    where: { userId },
    select: { id: true, companyName: true },
    orderBy: { companyName: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/documents" className="text-sm text-muted hover:text-foreground">
          ← Retour aux documents
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nouveau document</h1>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8">
          <p className="text-muted">
            Vous devez créer au moins un client avant de pouvoir émettre un document.
          </p>
          <Link href="/clients/new" className="mt-4 inline-block">
            <Button>Créer un client</Button>
          </Link>
        </div>
      ) : (
        <DocumentForm
          clients={clients.map((c) => ({ id: c.id, companyName: c.companyName }))}
          defaultType={type === 'INVOICE' ? 'INVOICE' : 'QUOTE'}
          isMicroEntrepreneur={profile?.isMicroEntrepreneur ?? false}
          action={createDocument}
        />
      )}
    </div>
  )
}