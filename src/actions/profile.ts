'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/dal'
import { FreelanceProfileSchema, type ActionState } from '@/lib/validations'

export async function upsertProfile(
  state: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await verifySession()

  const data = {
    displayName: formData.get('displayName'),
    legalName: formData.get('legalName'),
    legalForm: formData.get('legalForm'),
    siret: formData.get('siret'),
    apeCode: formData.get('apeCode') || undefined,
    tvaIntra: formData.get('tvaIntra') || undefined,
    capital: formData.get('capital') || undefined,
    addressStreet: formData.get('addressStreet'),
    addressZip: formData.get('addressZip'),
    addressCity: formData.get('addressCity'),
    addressCountry: formData.get('addressCountry') || 'France',
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    iban: formData.get('iban') || undefined,
    bic: formData.get('bic') || undefined,
    bankName: formData.get('bankName') || undefined,
    paymentTermsDays: formData.get('paymentTermsDays'),
    latePenaltyRate: formData.get('latePenaltyRate'),
    recoveryPriceFix: formData.get('recoveryPriceFix') || undefined,
    isTrainingOrganism: formData.get('isTrainingOrganism') === 'on',
    trainingNumDeclaration: formData.get('trainingNumDeclaration') || undefined,
    trainingQualiopiCertif: formData.get('trainingQualiopiCertif') === 'on',
    isMicroEntrepreneur: formData.get('isMicroEntrepreneur') === 'on',
    customLegalMentions: formData.get('customLegalMentions') || undefined,
  }

  const validated = FreelanceProfileSchema.safeParse(data)
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = validated.data
  const payload = {
    displayName: v.displayName,
    legalName: v.legalName,
    legalForm: v.legalForm,
    siret: v.siret,
    apeCode: v.apeCode ?? null,
    tvaIntra: v.tvaIntra ?? null,
    capital: v.capital ?? null,
    addressStreet: v.addressStreet,
    addressZip: v.addressZip,
    addressCity: v.addressCity,
    addressCountry: v.addressCountry,
    email: v.email,
    phone: v.phone ?? null,
    iban: v.iban ?? null,
    bic: v.bic ?? null,
    bankName: v.bankName ?? null,
    paymentTermsDays: v.paymentTermsDays,
    latePenaltyRate: v.latePenaltyRate,
    recoveryPriceFix: v.recoveryPriceFix ?? null,
    isTrainingOrganism: v.isTrainingOrganism,
    trainingNumDeclaration: v.trainingNumDeclaration ?? null,
    trainingQualiopiCertif: v.trainingQualiopiCertif,
    isMicroEntrepreneur: v.isMicroEntrepreneur,
    customLegalMentions: v.customLegalMentions ?? null,
  }

  const existing = await prisma.freelanceProfile.findUnique({ where: { userId } })

  if (existing) {
    await prisma.freelanceProfile.update({ where: { userId }, data: payload })
  } else {
    await prisma.freelanceProfile.create({ data: { userId, ...payload } })
  }

  revalidatePath('/profil')
  revalidatePath('/clients')
  return { success: true, message: 'Profil enregistré.' }
}