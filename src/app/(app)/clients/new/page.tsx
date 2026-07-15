import Link from 'next/link'
import { ClientForm } from '@/components/clients/client-form'

export const metadata = { title: 'Nouveau client — Tempofacture' }

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-muted hover:text-foreground">
          ← Retour aux clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouveau client
        </h1>
      </div>
      <ClientForm />
    </div>
  )
}