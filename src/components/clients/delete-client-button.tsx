'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'

export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={async () => {
        if (!confirm(`Supprimer le client « ${name} » ? Cette action est définitive.`)) return
        setPending(true)
        await deleteClient(id)
        setPending(false)
        router.refresh()
      }}
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </Button>
  )
}