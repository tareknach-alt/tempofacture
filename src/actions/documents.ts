'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/dal'
import {
  DocumentSchema,
  type ActionState,
} from '@/lib/validations'
import { computeLine, roundCurrency } from '@/lib/calc'
import { allocateDocumentNumber, assertNumberAvailable, type DocPrefix } from '@/lib/numeration'

function parseLines(formData: FormData) {
  const descriptions = formData.getAll('lineDescription[]')
  const quantities = formData.getAll('lineQuantity[]')
  const prices = formData.getAll('lineUnitPriceHT[]')
  const vats = formData.getAll('lineVatRate[]')

  const lines = []
  for (let i = 0; i < descriptions.length; i++) {
    lines.push({
      description: String(descriptions[i] ?? ''),
      quantity: Number(quantities[i] ?? 0),
      unitPriceHT: Number(prices[i] ?? 0),
      vatRate: Number(vats[i] ?? 0),
    })
  }
  return lines
}

function parseDocument(formData: FormData) {
  return {
    clientId: String(formData.get('clientId') ?? ''),
    type: String(formData.get('type') ?? 'QUOTE') as 'QUOTE' | 'INVOICE',
    subject: String(formData.get('subject') ?? '') || undefined,
    notes: String(formData.get('notes') ?? '') || undefined,
    footerNote: String(formData.get('footerNote') ?? '') || undefined,
    paymentTermsDays: formData.get('paymentTermsDays')
      ? Number(formData.get('paymentTermsDays'))
      : undefined,
    issueDate: String(formData.get('issueDate') ?? '') || undefined,
    lines: parseLines(formData),
  }
}

export async function createDocument(
  state: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await verifySession()

  const data = parseDocument(formData)
  const validated = DocumentSchema.safeParse(data)
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = validated.data

  // Vérifier que le client appartient à l'utilisateur
  const client = await prisma.client.findFirst({ where: { id: v.clientId, userId } })
  if (!client) {
    return { message: 'Client introuvable.' }
  }

  // Récupérer le profil pour le délai de paiement par défaut
  const profile = await prisma.freelanceProfile.findUnique({ where: { userId } })
  const paymentTermsDays = v.paymentTermsDays ?? profile?.paymentTermsDays ?? 30

  // Calculer les totaux
  const computedLines = v.lines.map((l, i) => {
    const c = computeLine(l)
    return {
      order: i + 1,
      description: l.description,
      quantity: l.quantity,
      unitPriceHT: l.unitPriceHT,
      vatRate: l.vatRate,
      lineHT: roundCurrency(c.lineHT),
      lineTVA: roundCurrency(c.lineTVA),
      lineTTC: roundCurrency(c.lineTTC),
    }
  })

  const totalHT = roundCurrency(computedLines.reduce((s, l) => s + l.lineHT, 0))
  const totalTVA = roundCurrency(computedLines.reduce((s, l) => s + l.lineTVA, 0))
  const totalTTC = roundCurrency(computedLines.reduce((s, l) => s + l.lineTTC, 0))

  const doc = await prisma.document.create({
    data: {
      userId,
      clientId: v.clientId,
      type: v.type,
      status: 'DRAFT',
      subject: v.subject ?? null,
      notes: v.notes ?? null,
      footerNote: v.footerNote ?? null,
      paymentTermsDays,
      totalHT,
      totalTVA,
      totalTTC,
      lines: { create: computedLines },
    },
  })

  revalidatePath('/documents')
  redirect(`/documents/${doc.id}`)
}

/**
 * Verrouillage d'un document : passage DRAFT -> ISSUED.
 * Attribue le numéro inaltérable et enregistre les totaux définitifs.
 */
export async function issueDocument(id: string): Promise<ActionState> {
  return issueDocumentSafe(id)
}

async function issueDocumentSafe(id: string): Promise<ActionState> {
  const { userId } = await verifySession()

  const doc = await prisma.document.findFirst({
    where: { id, userId },
    include: { lines: true },
  })
  if (!doc) return { message: 'Document introuvable.' }
  if (doc.status !== 'DRAFT') {
    return { message: 'Ce document est déjà verrouillé.' }
  }

  const prefix: DocPrefix = doc.type === 'QUOTE' ? 'DEV' : doc.type === 'INVOICE' ? 'FAC' : 'AVR'
  const issueDate = new Date()

  // Verrouillage + numérotation en transaction
  await prisma.$transaction(async (tx) => {
    const { number, year, month, seq } = await allocateDocumentNumber(userId, prefix, issueDate)
    await assertNumberAvailable(userId, number)

    const dueDate =
      doc.type === 'INVOICE' && doc.paymentTermsDays
        ? new Date(issueDate.getTime() + doc.paymentTermsDays * 24 * 60 * 60 * 1000)
        : null

    await tx.document.update({
      where: { id },
      data: {
        status: 'ISSUED',
        number,
        numberPrefix: prefix,
        numberYear: year,
        numberMonth: month,
        numberSeq: seq,
        issueDate,
        dueDate,
      },
    })
  })

  revalidatePath('/documents')
  revalidatePath(`/documents/${id}`)
  return { success: true, message: 'Document émis.' }
}

/**
 * Conversion d'un devis en facture en un clic.
 * Crée une nouvelle facture DRAFT reprenant les lignes du devis.
 */
export async function convertQuoteToInvoice(quoteId: string): Promise<ActionState> {
  const { userId } = await verifySession()

  const quote = await prisma.document.findFirst({
    where: { id: quoteId, userId, type: 'QUOTE' },
    include: { lines: true },
  })
  if (!quote) return { message: 'Devis introuvable.' }

  const invoice = await prisma.document.create({
    data: {
      userId,
      clientId: quote.clientId,
      type: 'INVOICE',
      status: 'DRAFT',
      subject: quote.subject,
      notes: quote.notes,
      footerNote: quote.footerNote,
      paymentTermsDays: quote.paymentTermsDays,
      totalHT: quote.totalHT,
      totalTVA: quote.totalTVA,
      totalTTC: quote.totalTTC,
      lines: {
        create: quote.lines.map((l) => ({
          order: l.order,
          description: l.description,
          quantity: Number(l.quantity),
          unitPriceHT: Number(l.unitPriceHT),
          vatRate: Number(l.vatRate),
          lineHT: Number(l.lineHT),
          lineTVA: Number(l.lineTVA),
          lineTTC: Number(l.lineTTC),
        })),
      },
    },
  })

  revalidatePath('/documents')
  redirect(`/documents/${invoice.id}`)
}

export async function deleteDocument(id: string): Promise<ActionState> {
  const { userId } = await verifySession()

  const doc = await prisma.document.findFirst({ where: { id, userId } })
  if (!doc) return { message: 'Document introuvable.' }

  // Interdiction de supprimer un document verrouillé (inaltérabilité légale)
  if (doc.status !== 'DRAFT') {
    return { message: 'Un document émis ne peut pas être supprimé.' }
  }

  await prisma.document.delete({ where: { id } })
  revalidatePath('/documents')
  return { success: true, message: 'Document supprimé.' }
}

export async function markPaid(id: string): Promise<ActionState> {
  const { userId } = await verifySession()

  const doc = await prisma.document.findFirst({
    where: { id, userId, type: 'INVOICE' },
  })
  if (!doc) return { message: 'Facture introuvable.' }
  if (doc.status === 'PAID') return { message: 'Déjà marquée payée.' }
  if (doc.status !== 'ISSUED' && doc.status !== 'LATE') {
    return { message: 'Seule une facture émise peut être marquée payée.' }
  }

  await prisma.document.update({ where: { id }, data: { status: 'PAID' } })
  revalidatePath('/documents')
  revalidatePath(`/documents/${id}`)
  revalidatePath('/tableau-de-bord')
  return { success: true, message: 'Facture marquée payée.' }
}

/**
 * Crée un avoir (CREDIT) lié à une facture verrouillée.
 * L'avoir reprend les lignes de la facture (négatives convention comptable).
 * Une fois émis, l'avoir porte son propre numéro (AVR-YYYY-MM-NNN) et
 * est lui-même inaltérable. La facture d'origine bascule en CANCELLED.
 */
export async function createCreditNote(
  invoiceId: string,
  reason?: string,
): Promise<ActionState> {
  const { userId } = await verifySession()

  const invoice = await prisma.document.findFirst({
    where: { id: invoiceId, userId, type: 'INVOICE' },
    include: { lines: true },
  })
  if (!invoice) return { message: 'Facture introuvable.' }
  if (invoice.status !== 'ISSUED' && invoice.status !== 'LATE' && invoice.status !== 'PAID') {
    return { message: 'L\'avoir ne peut concerner qu\'une facture émise.' }
  }

  // Crée l'avoir en brouillon
  const credit = await prisma.document.create({
    data: {
      userId,
      clientId: invoice.clientId,
      type: 'CREDIT',
      status: 'DRAFT',
      subject: reason ?? `Avoir sur facture ${invoice.number}`,
      notes: invoice.notes,
      footerNote: invoice.footerNote,
      paymentTermsDays: invoice.paymentTermsDays,
      totalHT: invoice.totalHT,
      totalTVA: invoice.totalTVA,
      totalTTC: invoice.totalTTC,
      creditFromId: invoiceId,
      lines: {
        create: invoice.lines.map((l) => ({
          order: l.order,
          description: l.description,
          quantity: Number(l.quantity),
          unitPriceHT: Number(l.unitPriceHT),
          vatRate: Number(l.vatRate),
          lineHT: Number(l.lineHT),
          lineTVA: Number(l.lineTVA),
          lineTTC: Number(l.lineTTC),
        })),
      },
    },
  })

  // Marque la facture d'origine comme annulée
  await prisma.document.update({
    where: { id: invoiceId },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/documents')
  revalidatePath(`/documents/${invoiceId}`)
  redirect(`/documents/${credit.id}`)
}

/**
 * Vérifie qu'un document verrouillé (ISSUED / PAID / LATE / CANCELLED) ne peut
 * pas être modifié. À appeler en amont de toute mutation d'un document.
 */
export async function assertEditable(id: string): Promise<ActionState | null> {
  const { userId } = await verifySession()
  const doc = await prisma.document.findFirst({ where: { id, userId }, select: { status: true } })
  if (!doc) return { message: 'Document introuvable.' }
  if (doc.status !== 'DRAFT') {
    return { message: 'Document verrouillé : modification interdite (inaltérabilité légale).' }
  }
  return null
}