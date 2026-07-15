'use server'

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { buildReminderEmail, type ReminderEmail, type ReminderLevel } from '@/lib/reminders'

/**
 * Action serveur : génère un brouillon d'email de relance en fonction du niveau
 * demandé et renvoie le texte au Client Component. Garantit que la facture
 * appartient à l'utilisateur connecté.
 */
export async function getReminderEmail(
  invoiceId: string,
  level: ReminderLevel,
): Promise<ReminderEmail | { error: string }> {
  const { userId } = await verifySession()

  const doc = await prisma.document.findFirst({
    where: { id: invoiceId, userId, type: 'INVOICE' },
    include: { client: true },
  })
  if (!doc) return { error: 'Facture introuvable.' }

  const profile = await prisma.freelanceProfile.findUnique({ where: { userId } })
  if (!profile) return { error: 'Profil manquant.' }

  return buildReminderEmail(doc, profile, level)
}