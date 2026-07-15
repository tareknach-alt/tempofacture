import 'server-only'

import { prisma } from '@/lib/db'
import { pool } from '@/lib/pg'

export type DocPrefix = 'DEV' | 'FAC' | 'AVR'

/**
 * Algorithme de numérotation automatique, séquentielle et chronologique.
 * Format : <PREFIX>-<YYYY>-<MM>-<NNN>
 *
 * Garanties légales :
 *  - continu (pas de trou, via next_document_sequence atomique)
 *  - chronologique (basé sur la date d'émission, pas sur createdAt)
 *  - inaltérable (l'utilisateur ne peut pas le saisir manuellement)
 *
 * À appeler dans une transaction Prisma au moment du verrouillage (ISSUED).
 */
export async function allocateDocumentNumber(
  userId: string,
  prefix: DocPrefix,
  issueDate: Date,
): Promise<{ number: string; year: number; month: number; seq: number }> {
  const year = issueDate.getUTCFullYear()
  const month = issueDate.getUTCMonth() + 1

  const seqRes = await pool.query<{ next_seq: number }>({
    text: 'SELECT next_document_sequence($1, $2, $3, $4) AS next_seq',
    values: [userId, prefix, year, month],
  })
  const seq = Number(seqRes.rows[0].next_seq)
  const number = `${prefix}-${year}-${String(month).padStart(2, '0')}-${String(seq).padStart(3, '0')}`

  return { number, year, month, seq }
}

/**
 * Vérifie qu'un numéro n'a jamais été utilisé par l'utilisateur (anti-collision).
 */
export async function assertNumberAvailable(userId: string, number: string) {
  const existing = await prisma.document.findFirst({
    where: { userId, number },
    select: { id: true },
  })
  if (existing) {
    throw new Error(`Le numéro ${number} existe déjà — collision évitée.`)
  }
}