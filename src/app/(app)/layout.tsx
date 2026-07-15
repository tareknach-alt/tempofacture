import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <main className="mx-auto w-full max-w-5xl px-8 py-10">{children}</main>
      </div>
    </div>
  )
}