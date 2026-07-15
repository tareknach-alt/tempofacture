'use client'

import { useEffect, useState } from 'react'
import { getReminderEmail } from '@/actions/reminders'
import type { ReminderEmail, ReminderLevel } from '@/lib/reminders'
import { Button } from '@/components/ui/button'

const LEVELS: { value: ReminderLevel; label: string; description: string }[] = [
  { value: 'amicale', label: '1 — Amicale', description: 'Premier rappel courtois' },
  { value: 'ferme', label: '2 — Ferme', description: 'Rappel des pénalités légales' },
  { value: 'mise-en-demeure', label: '3 — Mise en demeure', description: 'Formelle, fait courir les pénalités' },
]

export function ReminderComposer({
  invoiceId,
  clientEmail,
}: {
  invoiceId: string
  clientEmail: string
}) {
  const [level, setLevel] = useState<ReminderLevel>('amicale')
  const [email, setEmail] = useState<ReminderEmail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const r = await getReminderEmail(invoiceId, level)
        if (cancelled) return
        if ('error' in r) setEmail(null)
        else setEmail(r)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [invoiceId, level])

  const mailtoHref = email
    ? `mailto:${encodeURIComponent(email.to)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
    : '#'

  const copy = async () => {
    if (!email) return
    await navigator.clipboard.writeText(email.body)
    alert('Brouillon copié dans le presse-papier.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium mb-2">Niveau de relance</h2>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                level === l.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted hover:text-foreground'
              }`}
            >
              {l.label}
              <span className="block text-xs opacity-70 mt-0.5">{l.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="grid gap-2 sm:grid-cols-[80px_1fr] text-sm">
          <span className="text-muted">À</span>
          <span className="font-mono">{clientEmail}</span>
          <span className="text-muted">Objet</span>
          <span className="font-medium">{email?.subject ?? '…'}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Brouillon de l&rsquo;email</h2>
          <Button variant="ghost" type="button" onClick={copy} disabled={!email}>
            Copier
          </Button>
        </div>
        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground min-h-32">
          {loading ? 'Chargement…' : email?.body ?? ''}
        </pre>
      </div>

      <div className="flex justify-end gap-2">
        <a href={mailtoHref}>
          <Button disabled={!email}>Ouvrir dans le client de messagerie</Button>
        </a>
      </div>
    </div>
  )
}