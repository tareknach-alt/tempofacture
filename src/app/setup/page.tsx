import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { SetupForm } from '@/components/auth/setup-form'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const existing = await prisma.user.count()
  if (existing > 0) {
    redirect('/login')
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Bienvenue sur Tempofacture</h1>
          <p className="mt-2 text-sm text-muted">
            Créez votre compte administrateur pour paramétrer votre activité de
            formation et de coaching.
          </p>
        </div>
        <SetupForm />
      </div>
    </main>
  )
}