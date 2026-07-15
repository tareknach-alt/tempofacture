import { NextResponse } from 'next/server'
import { verifySession, getCurrentProfile } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { generateDocumentPDF } from '@/lib/pdf'
import { embedFacturX } from '@/lib/pdfa3'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  ctx: RouteContext<'/api/documents/[id]/pdf'>,
) {
  const { userId } = await verifySession()
  const { id } = await ctx.params

  const doc = await prisma.document.findFirst({
    where: { id, userId },
    include: {
      lines: { orderBy: { order: 'asc' } },
      client: true,
      creditFrom: { select: { number: true } },
    },
  })
  if (!doc) return new NextResponse('Not Found', { status: 404 })

  const profile = await getCurrentProfile()
  if (!profile) return new NextResponse('Profil manquant', { status: 500 })

  const basePdf = await generateDocumentPDF(doc, profile)

  // Pour les factures et avoirs émis, embarque le XML Factur-X (PDF/A-3)
  let pdfBytes: Uint8Array = basePdf
  if (
    doc.status !== 'DRAFT' &&
    (doc.type === 'INVOICE' || doc.type === 'CREDIT') &&
    doc.number
  ) {
    pdfBytes = await embedFacturX(basePdf, doc, profile)
  }

  const filename = `${doc.number ?? 'brouillon'}.pdf`
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Cache-Control': 'no-store',
  })

  return new NextResponse(pdfBytes as BodyInit, { status: 200, headers })
}