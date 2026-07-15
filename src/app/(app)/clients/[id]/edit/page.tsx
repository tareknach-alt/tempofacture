import { notFound } from 'next/navigation'
import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { ClientForm } from '@/components/clients/client-form'

export const dynamic = 'force-dynamic'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await verifySession()

  const client = await prisma.client.findFirst({ where: { id, userId } })
  if (!client) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-muted hover:text-foreground">
          ← Retour aux clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Modifier {client.companyName}
        </h1>
      </div>
      <ClientForm
        initial={{
          id: client.id,
          companyName: client.companyName,
          contactName: client.contactName,
          siret: client.siret,
          tvaIntra: client.tvaIntra,
          addressStreet: client.addressStreet,
          addressZip: client.addressZip,
          addressCity: client.addressCity,
          addressCountry: client.addressCountry,
          email: client.email,
          phone: client.phone,
          notes: client.notes,
        }}
      />
    </div>
  )
}