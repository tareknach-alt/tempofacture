import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base =
  'h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${base} ${className}`} {...props} />
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${base} min-h-20 py-2 ${className}`}
      {...props}
    />
  )
}

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1.5">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  )
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="mt-1 text-xs text-red-500">{errors[0]}</p>
}

export function FormMessage({
  message,
  success,
}: {
  message?: string
  success?: boolean
}) {
  if (!message) return null
  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${
        success
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
      }`}
    >
      {message}
    </p>
  )
}