'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createSession, deleteSession } from '@/lib/session'
import { LoginSchema, SetupSchema, type ActionState } from '@/lib/validations'

// Connexion ---------------------------------------------------------------

export async function login(state: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const user = await prisma.user.findUnique({ where: { email: validated.data.email } })
  if (!user || !(await bcrypt.compare(validated.data.password, user.passwordHash))) {
    return { message: 'Email ou mot de passe incorrect.' }
  }

  await createSession(user.id)
  redirect('/tableau-de-bord')
}

// Premier utilisateur (setup) --------------------------------------------

export async function setup(state: ActionState | undefined, formData: FormData): Promise<ActionState> {
  // Si un utilisateur existe déjà, on bloque la création
  const existing = await prisma.user.count()
  if (existing > 0) {
    return { message: 'Le compte a déjà été initialisé. Connectez-vous.' }
  }

  const validated = SetupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const passwordHash = await bcrypt.hash(validated.data.password, 10)
  const user = await prisma.user.create({
    data: {
      name: validated.data.name,
      email: validated.data.email,
      passwordHash,
    },
  })

  await createSession(user.id)
  redirect('/profil')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}