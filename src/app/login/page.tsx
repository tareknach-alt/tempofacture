import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Tempofacture
          </Link>
          <h1 className="mt-6 text-2xl font-semibold">Connexion</h1>
          <p className="mt-2 text-sm text-muted">
            Accédez à votre espace de facturation.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}