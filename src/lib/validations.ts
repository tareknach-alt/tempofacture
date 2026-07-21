import * as z from 'zod'

// --- Auth ---------------------------------------------------------------

export const LoginSchema = z.object({
  email: z.email({ error: 'Email invalide.' }).trim(),
  password: z.string().min(1, { error: 'Mot de passe requis.' }),
})

export const SetupSchema = z.object({
  name: z.string().min(2, { error: 'Le nom doit contenir au moins 2 caractères.' }).trim(),
  email: z.email({ error: 'Email invalide.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Au moins 8 caractères.' })
    .regex(/[a-zA-Z]/, { error: 'Doit contenir une lettre.' })
    .regex(/[0-9]/, { error: 'Doit contenir un chiffre.' }),
})

// --- Profil freelance ----------------------------------------------------

export const FreelanceProfileSchema = z.object({
  displayName: z.string().min(1, 'Requis'),
  legalName: z.string().min(1, 'Requis'),
  legalForm: z.string().min(1, 'Requis'),
  siret: z
    .string()
    .min(14, '14 chiffres requis')
    .max(14, '14 chiffres requis')
    .regex(/^\d{14}$/, 'SIRET : 14 chiffres'),
  apeCode: z.string().optional(),
  tvaIntra: z.string().optional(),
  capital: z.string().optional(),
  addressStreet: z.string().min(1, 'Requis'),
  addressZip: z.string().min(1, 'Requis'),
  addressCity: z.string().min(1, 'Requis'),
  addressCountry: z.string().min(1, 'Requis').default('France'),
  email: z.email({ error: 'Email invalide.' }),
  phone: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  bankName: z.string().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(120).default(30),
  latePenaltyRate: z.coerce.number().min(0).max(100).default(0),
  recoveryPriceFix: z.coerce.number().min(0).optional(),
  isTrainingOrganism: z.coerce.boolean().default(true),
  trainingNumDeclaration: z.string().optional(),
  trainingQualiopiCertif: z.coerce.boolean().default(false),
  isMicroEntrepreneur: z.coerce.boolean().default(false),
  customLegalMentions: z.string().optional(),
})

// --- Clients ------------------------------------------------------------

export const ClientSchema = z.object({
  companyName: z.string().min(1, 'Raison sociale requise'),
  contactName: z.string().optional(),
  siret: z
    .string()
    .min(1, 'SIRET requis')
    .regex(/^\d{14}$/, 'SIRET : 14 chiffres'),
  tvaIntra: z.string().optional(),
  addressStreet: z.string().min(1, 'Adresse requise'),
  addressZip: z.string().min(1, 'Code postal requis'),
  addressCity: z.string().min(1, 'Ville requise'),
  addressCountry: z.string().min(1, 'Pays requis').default('France'),
  email: z.email({ error: 'Email comptabilité invalide.' }),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

// --- Documents (devis & factures) ---------------------------------------

export const DocumentLineSchema = z.object({
  description: z.string().min(1, 'Description requise.'),
  quantity: z.coerce.number().refine((n) => n > 0, 'Doit être > 0.'),
  unitPriceHT: z.coerce.number().refine((n) => n >= 0, 'Prix ≥ 0.'),
  vatRate: z.coerce.number().min(0).max(100),
})

export const DocumentSchema = z.object({
  clientId: z.string().min(1, 'Client requis.'),
  type: z.enum(['QUOTE', 'INVOICE']),
  subject: z.string().optional(),
  notes: z.string().optional(),
  footerNote: z.string().optional(),
  issueDate: z.string().optional(), // ISO ; par défaut = aujourd'hui à l'émission
  paymentTermsDays: z.coerce.number().int().min(0).max(120).optional(),
  lines: z.array(DocumentLineSchema).min(1, 'Au moins une ligne de prestation.'),
})

export type ActionState = {
  errors?: Record<string, string[]>
  message?: string
  success?: boolean
}

export type FormState = ActionState | undefined