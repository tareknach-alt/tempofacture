'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/dal'

/**
 * Bascule automatique du statut ISSUED → LATE pour toutes les factures
 * dont la date d'échéance est dépassée. Appelée :
 *  - à l'affichage de la page dashboard / documents (rAF)
 *  - par le script quotidien scripts/cron-detect-late.ts
 */
export async function refreshLateStatuses(): Promise<{ updated: number }> {
  let updated = 0

  // Sur l'UI, on ne modifie que pour l'utilisateur connecté.
  // En cron, on passe outre (appel direct DB) — voir scripts/cron-detect-late.ts
  try {
    const { userId } = await verifySession()
    const now = new Date()
    const res = await prisma.document.updateMany({
      where: {
        userId,
        type: 'INVOICE',
        status: 'ISSUED',
        dueDate: { lt: now },
      },
      data: { status: 'LATE' },
    })
    updated = res.count
    if (updated > 0) {
      revalidatePath('/tableau-de-bord')
      revalidatePath('/documents')
    }
  } catch {
    // Pas de session (ex. appelé depuis un Server Component sans contexte)
    return { updated: 0 }
  }

  return { updated }
}

// Cron — pas de session requise ; utilisé par scripts/cron-detect-late.ts
export async function refreshLateStatusesAll(): Promise<{ updated: number }> {
  const now = new Date()
  const res = await prisma.document.updateMany({
    where: {
      type: 'INVOICE',
      status: 'ISSUED',
      dueDate: { lt: now },
    },
    data: { status: 'LATE' },
  })
  return { updated: res.count }
}