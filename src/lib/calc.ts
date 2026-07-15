/**
 * Calculs HT / TVA / TTC.
 *
 * Politique d'arrondi conforme aux usages comptables français :
 *  - montant HT ligne = qty * prixUnitaireHT, arrondi à 2 décimales (centime)
 *  - montant TVA ligne = HT * taux / 100, arrondi à 2 décimales
 *  - montant TTC ligne = HT + TVA (somme des arrondis)
 *  - totaux document = somme des arrondis ligne par ligne
 *
 * L'arrondi "ligne par ligne" est l'usage recommandé par l'administration
 * fiscale française pour les logiciels de facturation.
 */

export type LineInput = {
  quantity: number
  unitPriceHT: number
  vatRate: number
}

export type LineCalc = LineInput & {
  lineHT: number
  lineTVA: number
  lineTTC: number
}

const round2 = (n: number) => {
  // Arrondi au centime d'euro à partir de la représentation décimale
  // string (évite les imprécisions binaires : 3.015 est stocké 3.014999...).
  const sign = n < 0 ? -1 : 1
  const s = Math.abs(n).toFixed(3)
  // On ne garde que 2 décimales, arrondies au plus proche (half-up via 3e décimale).
  const [intPart, decPart = ''] = s.split('.')
  const d3 = (decPart + '000').slice(0, 3)
  let cents = Number(intPart) * 100 + Number(d3[0]) * 10 + Number(d3[1])
  if (Number(d3[2]) >= 5) cents += 1
  return (sign * cents) / 100
}

export function roundCurrency(n: number): number {
  return round2(n)
}

export function computeLine(input: LineInput): LineCalc {
  const ht = round2(input.quantity * input.unitPriceHT)
  const tva = round2((ht * input.vatRate) / 100)
  const ttc = round2(ht + tva)
  return { ...input, lineHT: ht, lineTVA: tva, lineTTC: ttc }
}

export type DocumentTotals = {
  totalHT: number
  totalTVA: number
  totalTTC: number
  byVatRate: { vatRate: number; baseHT: number; tva: number }[]
}

export function computeTotals(lines: LineInput[]): DocumentTotals {
  const computed = lines.map(computeLine)

  const totalHT = round2(computed.reduce((s, l) => s + l.lineHT, 0))
  const totalTVA = round2(computed.reduce((s, l) => s + l.lineTVA, 0))
  const totalTTC = round2(computed.reduce((s, l) => s + l.lineTTC, 0))

  // Récapitulatif par taux de TVA
  const byRate = new Map<number, { baseHT: number; tva: number }>()
  for (const l of computed) {
    const cur = byRate.get(l.vatRate) ?? { baseHT: 0, tva: 0 }
    cur.baseHT = round2(cur.baseHT + l.lineHT)
    cur.tva = round2(cur.tva + l.lineTVA)
    byRate.set(l.vatRate, cur)
  }
  const byVatRate = Array.from(byRate.entries())
    .map(([vatRate, v]) => ({ vatRate, baseHT: v.baseHT, tva: v.tva }))
    .sort((a, b) => a.vatRate - b.vatRate)

  return { totalHT, totalTVA, totalTTC, byVatRate }
}

export function formatCurrencyEUR(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n)
}

/**
 * Variante pour PDF : Helvetica/WinAnsi ne supporte pas les espaces insécables
 * (U+202F, U+00A0). On les remplace par un espace ASCII classique.
 */
export function formatCurrencyEURPDF(n: number): string {
  return formatCurrencyEUR(n)
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
}

export function formatNumber(n: number, digits = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)
}

export function formatNumberPDF(n: number, digits = 2): string {
  return formatNumber(n, digits)
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
}