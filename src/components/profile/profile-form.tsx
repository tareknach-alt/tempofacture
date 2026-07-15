'use client'

import { useActionState } from 'react'
import { upsertProfile } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import {
  Input,
  Textarea,
  Label,
  FieldError,
  FormMessage,
} from '@/components/ui/field'
export type ProfileInitial = {
  displayName: string | null
  legalName: string | null
  legalForm: string | null
  siret: string | null
  apeCode: string | null
  tvaIntra: string | null
  capital: string | null
  addressStreet: string | null
  addressZip: string | null
  addressCity: string | null
  addressCountry: string | null
  email: string | null
  phone: string | null
  iban: string | null
  bic: string | null
  bankName: string | null
  paymentTermsDays: number | null
  latePenaltyRate: string | null
  recoveryPriceFix: string | null
  isTrainingOrganism: boolean
  trainingNumDeclaration: string | null
  trainingQualiopiCertif: boolean
  customLegalMentions: string | null
}

function Checkbox({
  id,
  name,
  defaultChecked,
  label,
}: {
  id: string
  name: string
  defaultChecked?: boolean
  label: string
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-border accent-primary"
      />
      {label}
    </label>
  )
}

export function ProfileForm({
  profile,
}: {
  profile: ProfileInitial | null
}) {
  const [state, action, pending] = useActionState(upsertProfile, undefined)
  const e = state?.errors

  return (
    <form id="profile-form" action={action} className="space-y-8">
      <FormMessage message={state?.message} success={state?.success} />

      <Section title="Identité légale" description="Mentions obligatoires sur factures.">
        <Grid>
          <FieldField label="Nom commercial affiché" name="displayName" required value={profile?.displayName} error={e?.displayName} />
          <FieldField label="Raison sociale" name="legalName" required value={profile?.legalName} error={e?.legalName} />
          <FieldField label="Statut juridique" name="legalForm" required value={profile?.legalForm} error={e?.legalForm} placeholder="EI, SASU, EURL…" />
          <FieldField label="SIRET (14 chiffres)" name="siret" required value={profile?.siret} error={e?.siret} placeholder="12345678900012" />
          <FieldField label="Code NAF/APE" name="apeCode" value={profile?.apeCode} error={e?.apeCode} />
          <FieldField label="TVA intracommunautaire" name="tvaIntra" value={profile?.tvaIntra} error={e?.tvaIntra} placeholder="FR12345678901" />
          <FieldField label="Capital social" name="capital" value={profile?.capital ?? undefined} error={e?.capital} />
        </Grid>
      </Section>

      <Section title="Coordonnées" description="Adresse de l&rsquo;émetteur.">
        <Grid>
          <FieldField label="Adresse" name="addressStreet" required value={profile?.addressStreet} error={e?.addressStreet} />
          <FieldField label="Code postal" name="addressZip" required value={profile?.addressZip} error={e?.addressZip} />
          <FieldField label="Ville" name="addressCity" required value={profile?.addressCity} error={e?.addressCity} />
          <FieldField label="Pays" name="addressCountry" required value={profile?.addressCountry ?? 'France'} error={e?.addressCountry} />
          <FieldField label="Email" name="email" type="email" required value={profile?.email} error={e?.email} />
          <FieldField label="Téléphone" name="phone" value={profile?.phone ?? undefined} error={e?.phone} />
        </Grid>
      </Section>

      <Section title="Coordonnées bancaires (RIB)" description="Affichées en pied de facture.">
        <Grid>
          <FieldField label="IBAN" name="iban" value={profile?.iban ?? undefined} error={e?.iban} />
          <FieldField label="BIC" name="bic" value={profile?.bic ?? undefined} error={e?.bic} />
          <FieldField label="Banque" name="bankName" value={profile?.bankName ?? undefined} error={e?.bankName} />
        </Grid>
      </Section>

      <Section title="Paramètres de facturation" description="Conditions de paiement et pénalités (mentions légales).">
        <Grid>
          <FieldField label="Délai de paiement (jours)" name="paymentTermsDays" type="number" required value={profile?.paymentTermsDays ?? 30} error={e?.paymentTermsDays} />
          <FieldField label="Taux pénalités de retard (%)" name="latePenaltyRate" type="number" step="0.01" required value={profile?.latePenaltyRate != null ? String(profile.latePenaltyRate) : 0} error={e?.latePenaltyRate} />
          <FieldField label="Indemnité forfaitaire de recouvrement (€)" name="recoveryPriceFix" type="number" step="0.01" value={profile?.recoveryPriceFix != null ? String(profile.recoveryPriceFix) : undefined} error={e?.recoveryPriceFix} />
        </Grid>
      </Section>

      <Section title="Mentions spécifiques formation">
        <div className="space-y-3">
          <Checkbox id="isTrainingOrganism" name="isTrainingOrganism" defaultChecked={profile?.isTrainingOrganism ?? true} label="Organisme de formation" />
          <FieldField label="N° de déclaration d&rsquo;activité" name="trainingNumDeclaration" value={profile?.trainingNumDeclaration ?? undefined} error={e?.trainingNumDeclaration} />
          <Checkbox id="trainingQualiopiCertif" name="trainingQualiopiCertif" defaultChecked={profile?.trainingQualiopiCertif ?? false} label="Certifié Qualiopi" />
        </div>
        <div className="mt-4">
          <Label htmlFor="customLegalMentions">Mentions légales complémentaires</Label>
          <Textarea id="customLegalMentions" name="customLegalMentions" defaultValue={profile?.customLegalMentions ?? undefined} placeholder="Mentions libres ajoutées en pied de document…" />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer le profil'}
        </Button>
      </div>
    </form>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function FieldField({
  label,
  name,
  required,
  type = 'text',
  value,
  placeholder,
  error,
  step,
}: {
  label: string
  name: string
  required?: boolean
  type?: string
  value?: string | number | null
  placeholder?: string
  error?: string[]
  step?: string
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
        step={step}
        required={required}
        placeholder={placeholder}
        defaultValue={value === null || value === undefined ? undefined : String(value)}
      />
      <FieldError errors={error} />
    </div>
  )
}