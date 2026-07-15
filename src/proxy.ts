import { NextResponse, type NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

// Routes publiques (accessibles sans session)
const publicRoutes = ['/login', '/setup']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(path)

  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  // Si non authentifié et route protégée -> redirige vers /login
  if (!session?.userId && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // Si authentifié et sur une route publique -> redirige vers /tableau-de-bord
  if (session?.userId && isPublicRoute) {
    return NextResponse.redirect(new URL('/tableau-de-bord', req.nextUrl))
  }

  return NextResponse.next()
}

// Le proxy ne s'applique pas aux assets statiques ni aux routes API
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}