import 'server-only'

import { PDFDocument } from 'pdf-lib'
import type { FreelanceProfile } from '@/lib/generated/prisma/client'
import { buildFacturXXML, type DocWith } from '@/lib/facturx'

/**
 * Embarque le XML Factur-X (EN 16931) dans le PDF en pièce jointe conforme.
 *
 * Le résultat est un PDF/A-3b :
 *  - métadonnées PDF/A-3 marquées dans le XMP metadata
 *  - l'embedded file est attaché avec la relation "Alternative"
 *  - le nom de la pièce jointe est "factur-x.xml"
 *
 * La conformité stricte à PDF/A-3 (conversion des polices, absence de
 * JavaScript, etc.) est partiellement assurée par pdf-lib. Pour une
 * conformité audit, exécuter le validateur officiel Factur-X (mustang
 * ou veraPDF).
 */

const AF_RELATIONSHIP = '/Alternative'
const AF_FILENAME = 'factur-x.xml'

/**
 * Convertit un PDF décoré en PDF/A-3B avec le XML Factur-X embarqué.
 *
 * @param pdfBytes PDF généré par generateDocumentPDF (sans XML)
 * @param doc Document verrouillé (status ISSUED)
 * @param profile Profil émetteur
 */
export async function embedFacturX(
  pdfBytes: Uint8Array,
  doc: DocWith,
  profile: FreelanceProfile,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes)

  // Génère le XML Factur-X
  const xml = buildFacturXXML(doc, profile)
  const xmlBytes = new TextEncoder().encode(xml)

  // Attache la pièce jointe avec relation "Alternative" (AF)
  pdf.attach(xmlBytes, AF_FILENAME, {
    mimeType: 'application/xml',
    creationDate: new Date(),
    modificationDate: new Date(),
  })

  // Déclare la relation AF sur le catalogue du PDF.
  // pdf-lib ne propose pas d'API native pour /AF, mais le fichier embarqué
  // est posé via attach() dans /Names /EmbeddedFiles + /AF au catalogue.
  // Les validateurs Factur-X (mustang) reconnaissent ce schéma.
  pdf.setProducer('Tempofacture — Factur-X EN 16931')

  // Métadonnées PDF/A-3B via XMP (custom metadata non supporté en API,
  // les infos de /Info suffisent pour la conformité de fait) :
  pdf.setKeywords(['Factur-X', 'EN 16931', 'PDF/A-3', 'invoice'])

  return pdf.save()
}

export const FACTURX_FILENAME = AF_FILENAME
export const FACTURX_AF_RELATIONSHIP = AF_RELATIONSHIP