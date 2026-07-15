import 'server-only'

import {
  PDFFont,
  PDFPage,
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'
import type {
  Document as Doc,
  DocumentLine,
  Client,
  FreelanceProfile,
} from '@/lib/generated/prisma/client'
import { formatCurrencyEURPDF, formatNumberPDF } from '@/lib/calc'

type DocumentWith = Doc & {
  lines: DocumentLine[]
  client: Client
}

const C = {
  ink: rgb(0.07, 0.09, 0.16),
  muted: rgb(0.42, 0.45, 0.5),
  line: rgb(0.88, 0.91, 0.95),
  accent: rgb(0.31, 0.28, 0.9),
  accentSoft: rgb(0.93, 0.94, 0.99),
  white: rgb(1, 1, 1),
}

const DOC_LABELS: Record<string, string> = {
  QUOTE: 'Devis',
  INVOICE: 'Facture',
  CREDIT: 'Avoir',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  PAID: 'Payée',
  LATE: 'En retard',
  CANCELLED: 'Annulée',
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(d))
}

const margin = 42 // ~15mm
const pageW = 595.28 // A4 width in pt
const pageH = 841.89

export async function generateDocumentPDF(
  doc: DocumentWith,
  profile: FreelanceProfile,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(
    `${DOC_LABELS[doc.type] ?? 'Document'} ${doc.number ?? 'brouillon'}`,
  )
  pdf.setAuthor(profile.displayName || profile.legalName)
  pdf.setCreator('Tempofacture')
  pdf.setProducer('Tempofacture — pdf-lib')
  if (doc.issueDate) pdf.setCreationDate(new Date(doc.issueDate))

  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)

  const page = pdf.addPage([pageW, pageH])
  let y = pageH - margin

  // ---------------- En-tête : émetteur ----------------
  drawTextBlock(page, helvB, helv, {
    x: margin,
    y,
    title: profile.displayName || profile.legalName,
    lines: [
      profile.legalName,
      `${profile.legalForm} — SIRET ${profile.siret}`,
      profile.tvaIntra ? `TVA intracommunautaire : ${profile.tvaIntra}` : '',
      `${profile.addressStreet}`,
      `${profile.addressZip} ${profile.addressCity}, ${profile.addressCountry}`,
      profile.email,
      profile.phone ?? '',
    ].filter(Boolean),
    color: C.ink,
  })

  // Bloc droit : titre du document + numéro
  const rightX = pageW - margin
  const label = DOC_LABELS[doc.type] ?? 'Document'
  const status = doc.status
  page.drawText(label.toUpperCase(), {
    x: rightX - widthOf(label.toUpperCase(), helvB, 20),
    y,
    font: helvB,
    size: 20,
    color: C.accent,
  })

  y -= 24
  const numLine = doc.number ?? '(brouillon)'
  page.drawText(numLine, {
    x: rightX - widthOf(numLine, helv, 10),
    y,
    font: helv,
    size: 10,
    color: C.muted,
  })
  y -= 16
  if (doc.issueDate) {
    const date = `Émise le ${formatDate(doc.issueDate)}`
    page.drawText(date, {
      x: rightX - widthOf(date, helv, 10),
      y,
      font: helv,
      size: 10,
      color: C.muted,
    })
    y -= 14
  }
  if (doc.type === 'INVOICE' && doc.dueDate) {
    const due = `Échéance : ${formatDate(doc.dueDate)}`
    page.drawText(due, {
      x: rightX - widthOf(due, helv, 10),
      y,
      font: helv,
      size: 10,
      color: status === 'LATE' ? rgb(0.8, 0.2, 0.2) : C.muted,
    })
  }

  y = pageH - margin - 110 // reserve header height

  // ---------------- Bloc destinataire + statut ----------------
  drawTextBlock(page, helvB, helv, {
    x: margin,
    y,
    title: 'Destinataire',
    lines: [
      doc.client.companyName,
      doc.client.contactName ?? '',
      doc.client.siret ? `SIRET ${doc.client.siret}` : '',
      doc.client.tvaIntra ? `TVA : ${doc.client.tvaIntra}` : '',
      doc.client.addressStreet,
      `${doc.client.addressZip} ${doc.client.addressCity}, ${doc.client.addressCountry}`,
      doc.client.email,
    ].filter(Boolean),
    color: C.ink,
  })

  y -= 86
  if (doc.subject) {
    page.drawText(`Objet : ${doc.subject}`, { x: margin, y, font: helv, size: 11, color: C.ink })
    y -= 18
  }

  // Badge statut (si non payé)
  if (doc.status === 'ISSUED' || doc.status === 'LATE') {
    drawBadge(page, helvB, margin, y, STATUS_LABELS[doc.status] ?? '', C.accent)
    y -= 22
  }

  y -= 10

  // ---------------- Tableau des lignes ----------------
  const cols = {
    desc: { x: margin, w: 230 },
    qty: { x: margin + 230, w: 55, align: 'right' as const },
    unit: { x: margin + 230 + 55, w: 75, align: 'right' as const },
    vat: { x: margin + 230 + 55 + 75, w: 50, align: 'right' as const },
    ht: { x: margin + 230 + 55 + 75 + 50, w: 80, align: 'right' as const },
  }

  // En-tête colonnes
  y -= 20
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: pageW - margin * 2,
    height: 22,
    color: C.accentSoft,
  })
  const headerY = y
  drawCell(page, helvB, 'Description', cols.desc.x, headerY, cols.desc.w, 'left', C.ink, 10)
  drawCell(page, helvB, 'Qté', cols.qty.x, headerY, cols.qty.w, 'right', C.ink, 10)
  drawCell(page, helvB, 'P.U. HT', cols.unit.x, headerY, cols.unit.w, 'right', C.ink, 10)
  drawCell(page, helvB, 'TVA %', cols.vat.x, headerY, cols.vat.w, 'right', C.ink, 10)
  drawCell(page, helvB, 'Total HT', cols.ht.x, headerY, cols.ht.w, 'right', C.ink, 10)
  y -= 22

  // Lignes
  for (const l of doc.lines) {
    const rowH = 24 + Math.ceil(widthOf(l.description, helv, 10) / cols.desc.w) * 12
    if (y - rowH < margin + 200) {
      // Saute de page si on s'approche du pied
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageW - margin, y },
        thickness: 0.5,
        color: C.line,
      })
      pdf.addPage([pageW, pageH])
    }
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageW - margin, y },
      thickness: 0.5,
      color: C.line,
    })
    y -= 14
    drawWrapped(page, helv, l.description, cols.desc.x, y, cols.desc.w, 10, C.ink, 12)
    drawCell(page, helv, formatNumberPDF(Number(l.quantity), 3), cols.qty.x, y, cols.qty.w, 'right', C.ink, 10)
    drawCell(page, helv, formatNumberPDF(Number(l.unitPriceHT), 2), cols.unit.x, y, cols.unit.w, 'right', C.ink, 10)
    drawCell(page, helv, formatNumberPDF(Number(l.vatRate), 2), cols.vat.x, y, cols.vat.w, 'right', C.ink, 10)
    drawCell(page, helv, formatCurrencyEURPDF(Number(l.lineHT)), cols.ht.x, y, cols.ht.w, 'right', C.ink, 10)
    y -= 18
  }
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageW - margin, y },
    thickness: 0.5,
    color: C.line,
  })

  // ---------------- Totaux ----------------
  y -= 14
  const totalW = 220
  const totalX = pageW - margin - totalW
  drawTotals(page, helv, helvB, totalX, y, totalW, [
    ['Total HT', formatCurrencyEURPDF(Number(doc.totalHT)), C.ink],
    ['Total TVA', formatCurrencyEURPDF(Number(doc.totalTVA)), C.ink],
    ['Total TTC', formatCurrencyEURPDF(Number(doc.totalTTC)), C.accent],
  ])

  // ---------------- Mentions légales (pied) ----------------
  y = margin + 124
  drawLegalMentions(page, helv, helvB, doc, profile)

  return pdf.save()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function widthOf(s: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(s, size)
}

function drawTextBlock(
  page: PDFPage,
  bold: PDFFont,
  reg: PDFFont,
  block: { x: number; y: number; title: string; lines: string[]; color?: ReturnType<typeof rgb> },
) {
  const { x, y, title, lines } = block
  let curY = y
  page.drawText(title, { x, y: curY, font: bold, size: 11, color: block.color ?? C.ink })
  curY -= 14
  for (const l of lines) {
    page.drawText(l, { x, y: curY, font: reg, size: 9, color: C.muted })
    curY -= 12
  }
}

function drawCell(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  w: number,
  align: 'left' | 'right',
  color: ReturnType<typeof rgb>,
  size: number,
) {
  const tw = widthOf(text, font, size)
  const px = align === 'right' ? x + w - tw - 2 : x + 2
  page.drawText(text, { x: px, y, font, size, color })
}

function drawWrapped(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxW: number,
  size: number,
  color: ReturnType<typeof rgb>,
  lineHeight: number,
) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (widthOf(test, font, size) > maxW && line) {
      page.drawText(line, { x, y: curY, font, size, color })
      curY -= lineHeight
      line = w
    } else {
      line = test
    }
  }
  if (line) page.drawText(line, { x, y: curY, font, size, color })
}

function drawTotals(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  x: number,
  y: number,
  w: number,
  rows: [string, string, ReturnType<typeof rgb>][],
) {
  let curY = y
  for (const [label, value, color] of rows) {
    page.drawText(label, { x, y: curY, font, size: 10, color: C.muted })
    const vW = widthOf(value, bold, 11)
    page.drawText(value, { x: x + w - vW, y: curY, font: bold, size: 11, color })
    curY -= 18
  }
}

function drawBadge(
  page: PDFPage,
  bold: PDFFont,
  x: number,
  y: number,
  text: string,
  color: ReturnType<typeof rgb>,
) {
  const w = widthOf(text, bold, 9) + 16
  page.drawRectangle({ x, y, width: w, height: 16, color, borderWidth: 0 })
  page.drawText(text, {
    x: x + 8,
    y: y + 4,
    font: bold,
    size: 9,
    color: C.white,
  })
}

function drawLegalMentions(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  doc: DocumentWith,
  profile: FreelanceProfile,
) {
  const x = margin
  let y = margin + 110
  const w = pageW - margin * 2

  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.5, color: C.line })
  y -= 14

  const lines: string[] = []

  // Mentions obligatoires société
  if (profile.capital) lines.push(`Capital social : ${profile.capital}`)
  lines.push(`SIRET : ${profile.siret}`)
  if (profile.tvaIntra) lines.push(`TVA intracommunautaire : ${profile.tvaIntra}`)

  // Mentions paiement
  const terms = doc.paymentTermsDays ?? profile.paymentTermsDays
  lines.push(
    `Délai de paiement : ${terms} jours.`,
  )
  if (Number(profile.latePenaltyRate) > 0) {
    lines.push(
      `Pénalités de retard : ${formatNumberPDF(Number(profile.latePenaltyRate))} % par mois.`,
    )
  }
  if (profile.recoveryPriceFix) {
    lines.push(
      `Indemnité forfaitaire de recouvrement : ${formatCurrencyEURPDF(Number(profile.recoveryPriceFix))}.`,
    )
  }

  // Mentions spécifiques formation
  if (profile.isTrainingOrganism && profile.trainingNumDeclaration) {
    lines.push(
      `Organisme de formation n° ${profile.trainingNumDeclaration} — dispensé sous le code NAF ${profile.apeCode ?? 'non précisé'}.`,
    )
  }
  if (profile.trainingQualiopiCertif) {
    lines.push(
      `Certifié Qualiopi (certification attestant de la conformité aux critères du Référentiel National Qualité).`,
    )
  }

  // Coordonnées de règlement
  if (profile.iban) {
    lines.push(`Règlement par virement : IBAN ${profile.iban} — BIC ${profile.bic ?? ''}`)
  }

  if (doc.footerNote) lines.push(doc.footerNote)

  // Mentions libres complémentaires
  if (profile.customLegalMentions) lines.push(profile.customLegalMentions)

  // En cas d'avoir (Phase 3)
  if (doc.type === 'CREDIT' && doc.creditFromId) {
    lines.push(`Avoir relatif à la facture identifiée par ${doc.creditFromId}.`)
  }

  page.drawText('Mentions légales', { x, y, font: bold, size: 9, color: C.muted })
  y -= 12
  for (const l of lines) {
    drawWrapped(page, font, l, x, y, w, 8, C.muted, 10)
    y -= 10
  }
}