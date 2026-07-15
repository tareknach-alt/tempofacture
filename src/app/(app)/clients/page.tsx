import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { DeleteClientButton } from '@/components/clients/delete-client-button'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const { userId } = await verifySession()
  const clients = await prisma.client.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Gérez le carnet de clients de votre activité.
          </p>
        </div>
        <Link href="/clients/new">
          <Button>+ Nouveau client</Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted">Aucun client pour le moment.</p>
          <Link href="/clients/new">
            <Button className="mt-4">Ajouter votre premier client</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-border/20 text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Raison sociale</th>
                <th className="px-4 py-3 font-medium">SIRET</th>
                <th className="px-4 py-3 font-medium">Ville</th>
                <th className="px-4 py-3 font-medium">Email compta</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-border/10">
                  <td className="px-4 py-3 font-medium">{c.companyName}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{c.siret}</td>
                  <td className="px-4 py-3 text-muted">{c.addressCity}</td>
                  <td className="px-4 py-3 text-muted">{c.email}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <Link href={`/clients/${c.id}/edit`}>
                      <Button variant="secondary">Modifier</Button>
                    </Link>
                    <DeleteClientButton id={c.id} name={c.companyName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}