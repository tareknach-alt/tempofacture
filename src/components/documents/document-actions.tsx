'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { issueDocument, convertQuoteToInvoice, deleteDocument, markPaid, createCreditNote } from '@/actions/documents'
import { Button } from '@/components/ui/button'

export function DocumentActions({
  doc,
}: {
  doc: {
    id: string
    type: string
    status: string
    number: string | null
  }
}) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const run = async (key: string, fn: () => Promise<{ message?: string; success?: boolean }>) => {
    setError(null)
    setPending(key)
    const r = await fn()
    setPending(null)
    if (r && !r.success && r.message) setError(r.message)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {doc.status === 'DRAFT' && (
          <Button
            disabled={pending === 'issue'}
            onClick={() => run('issue', () => issueDocument(doc.id))}
          >
            {pending === 'issue' ? 'Verrouillage…' : 'Émettre (verrouiller)'}
          </Button>
        )}

        {doc.status === 'DRAFT' && (
          <Button
            variant="danger"
            disabled={pending === 'delete'}
            onClick={() => {
              if (!confirm('Supprimer ce brouillon ?')) return
              run('delete', () => deleteDocument(doc.id))
                .then(() => router.push('/documents'))
            }}
          >
            {pending === 'delete' ? 'Suppression…' : 'Supprimer'}
          </Button>
        )}

        {doc.type === 'INVOICE' && (doc.status === 'ISSUED' || doc.status === 'LATE') && (
          <Button
            variant="secondary"
            disabled={pending === 'paid'}
            onClick={() => run('paid', () => markPaid(doc.id))}
          >
            {pending === 'paid' ? 'Enregistrement…' : 'Marquer payée'}
          </Button>
        )}

        {doc.type === 'QUOTE' && doc.status !== 'DRAFT' && (
          <Button
            variant="secondary"
            disabled={pending === 'convert'}
            onClick={() => run('convert', () => convertQuoteToInvoice(doc.id))}
          >
            {pending === 'convert' ? 'Conversion…' : 'Convertir en facture'}
          </Button>
        )}

        {doc.type === 'INVOICE' && (doc.status === 'ISSUED' || doc.status === 'LATE' || doc.status === 'PAID') && (
          <Button
            variant="danger"
            disabled={pending === 'credit'}
            onClick={() => {
              if (!confirm('Créer un avoir pour cette facture ? La facture sera marquée annulée.')) return
              run('credit', () => createCreditNote(doc.id))
            }}
          >
            {pending === 'credit' ? 'Création…' : 'Créer un avoir'}
          </Button>
        )}
      </div>
    </div>
  )
}