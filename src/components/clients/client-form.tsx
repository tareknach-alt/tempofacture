'use client'

import { useActionState } from 'react'
import { createClient, updateClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import {
  Input,
  Textarea,
  Label,
  FieldError,
  FormMessage,
} from '@/components/ui/field'

export type ClientInitial = {
  id?: string
  companyName?: string
  contactName?: string | null
  siret?: string
  tvaIntra?: string | null
  addressStreet?: string
  addressZip?: string
  addressCity?: string
  addressCountry?: string
  email?: string
  phone?: string | null
  notes?: string | null
}

export function ClientForm({ initial }: { initial?: ClientInitial }) {
  const action = initial?.id
    ? updateClient.bind(null, initial.id)
    : createClient
  const [state, formAction, pending] = useActionState(action, undefined)
  const e = state?.errors

  return (
    <form id="client-form" action={formAction} className="space-y-8">
      <FormMessage message={state?.message} success={state?.success} />

      <Section title="Identification">
        <Grid>
          <FF label="Raison sociale" name="companyName" required initial={initial?.companyName} error={e?.companyName} />
          <FF label="Contact référent" name="contactName" initial={initial?.contactName ?? undefined} error={e?.contactName} />
          <FF label="SIRET (14 chiffres)" name="siret" required initial={initial?.siret} error={e?.siret} placeholder="12345678900012" />
          <FF label="TVA intracommunautaire" name="tvaIntra" initial={initial?.tvaIntra ?? undefined} error={e?.tvaIntra} />
        </Grid>
      </Section>

      <Section title="Adresse">
        <Grid>
          <FF label="Adresse" name="addressStreet" required initial={initial?.addressStreet} error={e?.addressStreet} />
          <FF label="Code postal" name="addressZip" required initial={initial?.addressZip} error={e?.addressZip} />
          <FF label="Ville" name="addressCity" required initial={initial?.addressCity} error={e?.addressCity} />
          <FF label="Pays" name="addressCountry" required initial={initial?.addressCountry ?? 'France'} error={e?.addressCountry} />
        </Grid>
      </Section>

      <Section title="Contact comptabilité">
        <Grid>
          <FF label="Email comptabilité" name="email" type="email" required initial={initial?.email} error={e?.email} />
          <FF label="Téléphone" name="phone" initial={initial?.phone ?? undefined} error={e?.phone} />
        </Grid>
        <div className="mt-4">
          <Label htmlFor="notes">Notes internes</Label>
          <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? undefined} />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Enregistrement…'
            : initial?.id
              ? 'Enregistrer les modifications'
              : 'Créer le client'}
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function FF({
  label,
  name,
  required,
  type = 'text',
  initial,
  placeholder,
  error,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  initial?: string
  placeholder?: string
  error?: string[]
}) {
  return (
    <div>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={initial}
      />
      <FieldError errors={error} />
    </div>
  )
}