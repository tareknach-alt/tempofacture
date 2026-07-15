'use client'

import { useActionState } from 'react'
import { setup } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input, Label, FieldError, FormMessage } from '@/components/ui/field'

export function SetupForm() {
  const [state, action, pending] = useActionState(setup, undefined)

  return (
    <form id="setup-form" action={action} className="space-y-4">
      <div>
        <Label htmlFor="name" required>
          Votre nom
        </Label>
        <Input id="name" name="name" required />
        <FieldError errors={state?.errors?.name} />
      </div>

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
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <FieldError errors={state?.errors?.password} />
        <p className="mt-1 text-xs text-muted">
          Minimum 8 caractères, incluant une lettre et un chiffre.
        </p>
      </div>

      <FormMessage message={state?.message} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Création…' : 'Créer le compte'}
      </Button>
    </form>
  )
}