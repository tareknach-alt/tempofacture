import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { prisma } from '@/lib/db'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    redirect('/login')
  }

  return { isAuth: true, userId: session.userId }
})

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession()

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })
    return user
  } catch {
    return null
  }
})

export const getCurrentProfile = cache(async () => {
  const { userId } = await verifySession()

  try {
    return await prisma.freelanceProfile.findUnique({
      where: { userId },
    })
  } catch {
    return null
  }
})