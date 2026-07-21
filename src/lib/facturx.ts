import 'server-only'

import { create } from 'xmlbuilder2'
import type {
  Document as Doc,
  DocumentLine,
  Client,
  FreelanceProfile,
} from '@/lib/generated/prisma/client'

/**
 * Génération du XML Factur-X (norme EN 16931) — profil BASIC.
 *
 * Le profil BASIC couvre les factures domestiques françaises (TVA, paiement,
 * lignes obligatoires). Il est le minimum viable pour la facturation
 * électronique obligatoire (BtoB France, à partir du 26/09/2026).
 *
 * Spec de référence : https://github.com/ Bordugov / Factur-X
 *   — Cross Industry Invoice (CII) — Namespace :
 *     urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100
 *
 * Le XML s'embarque dans le PDF en pièce jointe (AF) avec :
 *   - Nom : factur-x.xml
 *   - MIME : application/xml
 *   - Relation : Alternative
 *   - PDF/A-3B requirement.
 */

const NS = {
  rsm: 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
  ram: 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationModel:100',
  udt: 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
  qdt: 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100',
  xsd: 'http://www.w3.org/2001/XMLSchema',
}

type DocWith = Doc & {
  lines: DocumentLine[]
  client: Client
  creditFrom?: { number: string | null } | null
}

function xmlDate(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function fmt(n: number, dec = 2): string {
  return n.toFixed(dec)
}

export function buildFacturXXML(
  doc: DocWith,
  profile: FreelanceProfile,
): string {
  if (!doc.number) throw new Error('Document sans numéro — impossible de générer le XML.')
  if (!doc.issueDate) throw new Error('Document non émis — date d\'émission manquante.')

  // Maps des types Documents
  // 380 = Facture commerciale, 381 = Avoir, 751 = Facture (infos préalables)
  const typeCode = doc.type === 'CREDIT' ? '381' : '380'

  // TVA par taux
  const vatMap = new Map<number, { base: number; amount: number }>()
  for (const l of doc.lines) {
    const r = Number(l.vatRate)
    const cur = vatMap.get(r) ?? { base: 0, amount: 0 }
    cur.base += Number(l.lineHT)
    cur.amount += Number(l.lineTVA)
    vatMap.set(r, cur)
  }
  const vatBreakdown = Array.from(vatMap.entries()).sort((a, b) => a[0] - b[0])

  const currency = 'EUR'
  const isCredit = doc.type === 'CREDIT'

  const builder = create({ version: '1.0', encoding: 'UTF-8' })
  const root = builder.ele(NS.rsm, 'CrossIndustryInvoice')
  // Force les préfixes xmlns:rsm, xmlns:ram, xmlns:udt dans la déclaration du document
  root.att('xmlns:rsm', NS.rsm)
  root.att('xmlns:ram', NS.ram)
  root.att('xmlns:udt', NS.udt)
  root.att('xmlns:qdt', NS.qdt)

  // ExchangedDocumentContext
  const ctx = root.ele('rsm:ExchangedDocumentContext')
  ctx
    .ele('ram:BusinessProcessSpecifiedDocumentContextParameter')
    .ele('ram:ID')
    .txt('A1')
    .up()
  ctx
    .ele('ram:GuidelineSpecifiedDocumentContextParameter')
    .ele('ram:ID')
    .att('schemeID', 'URN')
    .txt('urn:cen.eu:en16931:2017')
    .up()

  // ExchangedDocument
  const exDoc = root.ele('rsm:ExchangedDocument')
  exDoc.ele('ram:ID').txt(doc.number).up()
  exDoc.ele('ram:TypeCode').txt(typeCode).up()
  exDoc
    .ele('ram:IssueDateTime')
    .ele('udt:DateTimeString')
    .att('format', '102')
    .txt(xmlDate(new Date(doc.issueDate)))
    .up()
  if (doc.subject) {
    exDoc
      .ele('ram:IncludedNote')
      .ele('ram:Content')
      .txt(doc.subject)
      .up()
  }

  // SupplyChainTradeTransaction
  const sctt = root.ele('rsm:SupplyChainTradeTransaction')

  // --- ApplicableHeaderTradeAgreement ---
  const hta = sctt.ele('ram:ApplicableHeaderTradeAgreement')
  hta
    .ele('ram:SellerTradeParty')
    .ele('ram:ID').txt(profile.siret).up()
    .ele('ram:Name').txt(profile.legalName).up()
    .ele('ram:Description').txt(profile.displayName).up()
  if (profile.tvaIntra) {
    hta
      .ele('ram:SpecifiedTaxRegistration')
      .ele('ram:ApplicableTradeTax')
      .ele('ram:TypeCode').txt('VAT').up()
      .ele('ram:ID').txt(profile.tvaIntra).up()
  }
  hta
    .ele('ram:PostalTradeAddress')
    .ele('ram:PostcodeCode').txt(profile.addressZip).up()
    .ele('ram:LineOneString').ele('udt:Content').txt(profile.addressStreet).up().up()
    .ele('ram:CityName').txt(profile.addressCity).up()
    .ele('ram:CountryID').txt('FR').up()
  hta
    .ele('ram:URIUniversalCommunication')
    .ele('ram:URIID').att('schemeID', 'EM').txt(profile.email).up()

  // Buyer (client)
  hta
    .ele('ram:BuyerTradeParty')
    .ele('ram:ID').txt(doc.client.siret).up()
    .ele('ram:Name').txt(doc.client.companyName).up()
  if (doc.client.tvaIntra) {
    hta
      .ele('ram:SpecifiedTaxRegistration')
      .ele('ram:ApplicableTradeTax')
      .ele('ram:TypeCode').txt('VAT').up()
      .ele('ram:ID').txt(doc.client.tvaIntra).up()
  }
  hta
    .ele('ram:PostalTradeAddress')
    .ele('ram:PostcodeCode').txt(doc.client.addressZip).up()
    .ele('ram:LineOneString').ele('udt:Content').txt(doc.client.addressStreet).up().up()
    .ele('ram:CityName').txt(doc.client.addressCity).up()
    .ele('ram:CountryID').txt(doc.client.addressCountry === 'France' ? 'FR' : doc.client.addressCountry).up()

  // Lien avoir → facture
  if (isCredit && doc.creditFrom?.number) {
    hta
      .ele('ram:AdditionalReferencedDocument')
      .ele('ram:IssuerAssignedID').txt(doc.creditFrom.number).up()
      .ele('ram:TypeCode').txt('T').up()
  }

  // --- ApplicableHeaderTradeDelivery ---
  sctt
    .ele('ram:ApplicableHeaderTradeDelivery')
    .ele('ram:ActualDeliverySupplyChainEvent')
    .ele('ram:OccurrenceDateTime')
    .ele('udt:DateTimeString')
    .att('format', '102')
    .txt(xmlDate(new Date(doc.issueDate)))
    .up()

  // --- ApplicableHeaderTradeSettlement ---
  const ahts = sctt.ele('ram:ApplicableHeaderTradeSettlement')
  ahts
    .ele('ram:PaymentReference')
    .txt(doc.number)
    .up()
  ahts.ele('ram:TradeCurrencyCode').txt(currency).up()

  // Récapitulatif TVA
  for (const [rate, v] of vatBreakdown) {
    const tax = ahts.ele('ram:ApplicableTradeTax')
    tax.ele('ram:CalculatedAmount').txt(fmt(v.amount)).up()
    tax.ele('ram:TypeCode').txt('VAT').up()
    tax.ele('ram:BasisAmount').txt(fmt(v.base)).up()
    if (rate === 0 && profile.isMicroEntrepreneur) {
      tax.ele('ram:CategoryCode').txt('E').up()
      tax
        .ele('ram:ExemptionReason')
        .txt('TVA non applicable, art. 293 B du CGI (micro-entrepreneur)')
        .up()
    } else {
      tax.ele('ram:CategoryCode').txt(rate === 0 ? 'Z' : 'S').up()
    }
    tax.ele('ram:RateApplicablePercent').txt(fmt(rate)).up()
  }

  // Somme HT/TVA/TTC
  ahts
    .ele('ram:SpecifiedTradeSettlementHeaderMonetarySummation')
    .ele('ram:LineTotalAmount').txt(fmt(Number(doc.totalHT))).up()
    .ele('ram:TaxBasisTotalAmount').txt(fmt(Number(doc.totalHT))).up()
    .ele('ram:TaxTotalAmount').att('currencyID', currency).txt(fmt(Number(doc.totalTVA))).up()
    .ele('ram:GrandTotalAmount').att('currencyID', currency).txt(fmt(Number(doc.totalTTC))).up()
    .ele('ram:DuePayableAmount').att('currencyID', currency).txt(fmt(Number(doc.totalTTC))).up()

  // Période de paiement
  if (doc.dueDate && doc.paymentTermsDays) {
    ahts
      .ele('ram:SpecifiedTradePaymentTerms')
      .ele('ram:Description').txt(`Paiement à ${doc.paymentTermsDays} jours`).up()
      .ele('ram:DueDateDateTime')
      .ele('udt:DateTimeString')
      .att('format', '102')
      .txt(xmlDate(new Date(doc.dueDate)))
      .up()
  }

  // --- Lignes ---
  for (const l of doc.lines) {
    const line = sctt.ele('ram:IncludedTradeLineItem')
    line
      .ele('ram:AssociatedDocumentLineDocument')
      .ele('ram:LineID').txt(String(l.order)).up()
    line
      .ele('ram:SpecifiedTradeProduct')
      .ele('ram:Name').txt(l.description).up()
    line
      .ele('ram:SpecifiedLineTradeAgreement')
      .ele('ram:NetPriceProductTradePrice')
      .ele('ram:ChargeAmount').txt(fmt(Number(l.unitPriceHT))).up()
    const lta = line.ele('ram:SpecifiedLineTradeSettlement')
    lta
      .ele('ram:ApplicableTradeTax')
      .ele('ram:TypeCode').txt('VAT').up()
      .ele('ram:CategoryCode').txt(Number(l.vatRate) === 0 ? 'Z' : 'S').up()
      .ele('ram:RateApplicablePercent').txt(fmt(Number(l.vatRate))).up()
    lta
      .ele('ram:SpecifiedTradeSettlementLineMonetarySummation')
      .ele('ram:LineTotalAmount').txt(fmt(Number(l.lineHT))).up()
    // BilledQuantity auf parent line
    line
      .ele('ram:SpecifiedLineTradeDelivery')
      .ele('ram:BilledQuantity').att('unitCode', 'C62').txt(fmt(Number(l.quantity), 3)).up()
  }

  return builder.end({ prettyPrint: true })
}

// Fallback export pour tests
export type { DocWith }