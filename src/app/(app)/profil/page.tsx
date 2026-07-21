import { getCurrentProfile } from '@/lib/dal'
import { ProfileForm, type ProfileInitial } from '@/components/profile/profile-form'

export const metadata = { title: 'Profil — Tempofacture' }

export default async function ProfilPage() {
  const p = await getCurrentProfile()

  // Sérialisation : les Decimal de Prisma ne peuvent pas traverser la limite
  // Server -> Client Component. On convertit en chaînes.
  const profile: ProfileInitial | null = p
    ? {
        displayName: p.displayName,
        legalName: p.legalName,
        legalForm: p.legalForm,
        siret: p.siret,
        apeCode: p.apeCode,
        tvaIntra: p.tvaIntra,
        capital: p.capital,
        addressStreet: p.addressStreet,
        addressZip: p.addressZip,
        addressCity: p.addressCity,
        addressCountry: p.addressCountry,
        email: p.email,
        phone: p.phone,
        iban: p.iban,
        bic: p.bic,
        bankName: p.bankName,
        paymentTermsDays: p.paymentTermsDays,
        latePenaltyRate: p.latePenaltyRate.toString(),
        recoveryPriceFix: p.recoveryPriceFix ? p.recoveryPriceFix.toString() : null,
        isTrainingOrganism: p.isTrainingOrganism,
        trainingNumDeclaration: p.trainingNumDeclaration,
        trainingQualiopiCertif: p.trainingQualiopiCertif,
        isMicroEntrepreneur: p.isMicroEntrepreneur,
        customLegalMentions: p.customLegalMentions,
      }
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil freelance</h1>
        <p className="mt-1 text-sm text-muted">
          Vos coordonnées et mentions légales, reprises sur chaque document émis.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}