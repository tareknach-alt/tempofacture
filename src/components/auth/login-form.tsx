'use client'

import { useActionState } from 'react'
import { login } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input, Label, FieldError, FormMessage } from '@/components/ui/field'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError errors={state?.errors?.email} />
      </div>

      <div>
        <Label htmlFor="password" required>
          Mot de passe
        </Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        <FieldError errors={state?.errors?.password} />
      </div>

      <FormMessage message={state?.message} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  )
}