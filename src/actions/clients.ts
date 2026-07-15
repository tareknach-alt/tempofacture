'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/dal'
import { ClientSchema, type ActionState } from '@/lib/validations'

function parseClient(formData: FormData) {
  return {
    companyName: formData.get('companyName'),
    contactName: formData.get('contactName') || undefined,
    siret: formData.get('siret'),
    tvaIntra: formData.get('tvaIntra') || undefined,
    addressStreet: formData.get('addressStreet'),
    addressZip: formData.get('addressZip'),
    addressCity: formData.get('addressCity'),
    addressCountry: formData.get('addressCountry') || 'France',
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    notes: formData.get('notes') || undefined,
  }
}

export async function createClient(
  state: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await verifySession()

  const validated = ClientSchema.safeParse(parseClient(formData))
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = validated.data
  await prisma.client.create({
    data: {
      userId,
      companyName: v.companyName,
      contactName: v.contactName ?? null,
      siret: v.siret,
      tvaIntra: v.tvaIntra ?? null,
      addressStreet: v.addressStreet,
      addressZip: v.addressZip,
      addressCity: v.addressCity,
      addressCountry: v.addressCountry,
      email: v.email,
      phone: v.phone ?? null,
      notes: v.notes ?? null,
    },
  })

  revalidatePath('/clients')
  redirect('/clients')
}

export async function updateClient(
  id: string,
  state: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await verifySession()

  const validated = ClientSchema.safeParse(parseClient(formData))
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = validated.data
  // On s'assure que le client appartient à l'utilisateur connecté
  const owned = await prisma.client.findFirst({ where: { id, userId } })
  if (!owned) {
    return { message: 'Client introuvable.' }
  }

  await prisma.client.update({
    where: { id },
    data: {
      companyName: v.companyName,
      contactName: v.contactName ?? null,
      siret: v.siret,
      tvaIntra: v.tvaIntra ?? null,
      addressStreet: v.addressStreet,
      addressZip: v.addressZip,
      addressCity: v.addressCity,
      addressCountry: v.addressCountry,
      email: v.email,
      phone: v.phone ?? null,
      notes: v.notes ?? null,
    },
  })

  revalidatePath('/clients')
  redirect('/clients')
}

export async function deleteClient(id: string): Promise<ActionState> {
  const { userId } = await verifySession()

  const owned = await prisma.client.findFirst({ where: { id, userId } })
  if (!owned) {
    return { message: 'Client introuvable.' }
  }

  await prisma.client.delete({ where: { id } })
  revalidatePath('/clients')
  return { success: true, message: 'Client supprimé.' }
}