'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, FieldError, FormMessage } from '@/components/ui/field'
import { computeLine, formatCurrencyEUR } from '@/lib/calc'
import type { ActionState } from '@/lib/validations'

type LineState = {
  key: number
  description: string
  quantity: string
  unitPriceHT: string
  vatRate: string
}

let lineCounter = 0
function newLine(isMicroEntrepreneur = false): LineState {
  lineCounter += 1
  return {
    key: lineCounter,
    description: '',
    quantity: '1',
    unitPriceHT: '',
    vatRate: isMicroEntrepreneur ? '0' : '20',
  }
}

type ClientOption = { id: string; companyName: string }

export function DocumentForm({
  clients,
  defaultType,
  isMicroEntrepreneur = false,
  action,
}: {
  clients: ClientOption[]
  defaultType: 'QUOTE' | 'INVOICE'
  isMicroEntrepreneur?: boolean
  action: (state: ActionState | undefined, formData: FormData) => Promise<ActionState>
}) {
  const [lines, setLines] = useState<LineState[]>([newLine(isMicroEntrepreneur)])
  const [type, setType] = useState<'QUOTE' | 'INVOICE'>(defaultType)
  const [state, formAction, pending] = useActionState(action, undefined)

  const updateLine = (i: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines((prev) => [...prev, newLine()])
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))

  // Totaux recalcul côté client pour feedback immédiat
  const totals = lines.reduce(
    (acc, l) => {
      const c = computeLine({
        quantity: Number(l.quantity) || 0,
        unitPriceHT: Number(l.unitPriceHT) || 0,
        vatRate: Number(l.vatRate) || 0,
      })
      acc.ht += c.lineHT
      acc.tva += c.lineTVA
      acc.ttc += c.lineTTC
      return acc
    },
    { ht: 0, tva: 0, ttc: 0 },
  )

  const e = state?.errors

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="type" value={type} />

      <FormMessage message={state?.message} />

      {isMicroEntrepreneur && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <strong>Micro-entrepreneur :</strong> TVA non applicable, art. 293 B du CGI.
          Les lignes sont facturées HT sans TVA. La mention légale sera
          automatiquement présente sur le PDF.
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Paramètres</h2>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setType('QUOTE')}
              className={`px-3 py-1.5 text-sm rounded-md ${
                type === 'QUOTE' ? 'bg-primary text-primary-foreground' : 'text-muted'
              }`}
            >
              Devis
            </button>
            <button
              type="button"
              onClick={() => setType('INVOICE')}
              className={`px-3 py-1.5 text-sm rounded-md ${
                type === 'INVOICE' ? 'bg-primary text-primary-foreground' : 'text-muted'
              }`}
            >
              Facture
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="clientId" required>Client</Label>
            <select
              id="clientId"
              name="clientId"
              required
              defaultValue=""
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="" disabled>— Sélectionner —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
            <FieldError errors={e?.clientId} />
          </div>
          <div>
            <Label htmlFor="paymentTermsDays">Délai de paiement (jours)</Label>
            <Input id="paymentTermsDays" name="paymentTermsDays" type="number" defaultValue={30} />
          </div>
          <div>
            <Label htmlFor="subject">Objet</Label>
            <Input id="subject" name="subject" placeholder="Objet du document" />
          </div>
          <div>
            <Label htmlFor="issueDate">Date d&rsquo;émission (verrouillage)</Label>
            <Input id="issueDate" name="issueDate" type="date" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Lignes de prestation</h2>
          <Button type="button" variant="secondary" onClick={addLine}>+ Ligne</Button>
        </div>

        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.key} className="grid grid-cols-12 gap-2 items-start">
              <input type="hidden" name="lineOrder[]" value={i + 1} />
              <div className="col-span-12 sm:col-span-5">
                <Input
                  name="lineDescription[]"
                  placeholder="Description de la prestation"
                  value={l.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input
                  name="lineQuantity[]"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Qté"
                  value={l.quantity}
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  name="lineUnitPriceHT[]"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="P.U. HT"
                  value={l.unitPriceHT}
                  onChange={(e) => updateLine(i, { unitPriceHT: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                {isMicroEntrepreneur ? (
                  <input type="hidden" name="lineVatRate[]" value="0" />
                ) : (
                  <Input
                    name="lineVatRate[]"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="TVA %"
                    value={l.vatRate}
                    onChange={(e) => updateLine(i, { vatRate: e.target.value })}
                    required
                  />
                )}
              </div>
              <div className="col-span-2 sm:col-span-1 text-right text-sm tabular-nums pt-2">
                {formatCurrencyEUR(
                  computeLine({
                    quantity: Number(l.quantity) || 0,
                    unitPriceHT: Number(l.unitPriceHT) || 0,
                    vatRate: Number(l.vatRate) || 0,
                  }).lineHT,
                )}
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeLine(i)}
                  aria-label="Supprimer la ligne"
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>

        {e?.lines && <FieldError errors={e.lines} />}

        <div className="ml-auto w-64 space-y-1 border-t border-border pt-3 text-sm">
          <Row label="Total HT" value={formatCurrencyEUR(totals.ht)} />
          <Row label="Total TVA" value={formatCurrencyEUR(totals.tva)} />
          <Row label="Total TTC" value={formatCurrencyEUR(totals.ttc)} strong />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-medium">Notes</h2>
        <div>
          <Label htmlFor="footerNote">Mention en pied de document</Label>
          <Textarea id="footerNote" name="footerNote" placeholder="Conditions particulières, modalités…" />
        </div>
        <div>
          <Label htmlFor="notes">Notes internes (non affichées)</Label>
          <Textarea id="notes" name="notes" />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer en brouillon'}
        </Button>
      </div>
    </form>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold text-foreground' : 'text-muted'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}