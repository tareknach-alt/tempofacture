import Link from 'next/link'
import { getCurrentUser } from '@/lib/dal'
import { LogoutButton } from '@/components/auth/logout-button'

const nav = [
  { href: '/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/clients', label: 'Clients' },
  { href: '/documents', label: 'Documents' },
  { href: '/profil', label: 'Profil' },
]

export async function Sidebar() {
  const user = await getCurrentUser()

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <Link href="/tableau-de-bord" className="text-lg font-semibold tracking-tight">
          Tempofacture
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-border/40 hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-4 space-y-1">
        {user && (
          <div className="px-3 pb-2 text-xs text-muted">
            {user.name}
            <br />
            <span className="text-muted/70">{user.email}</span>
          </div>
        )}
        <LogoutButton />
      </div>
    </aside>
  )
}