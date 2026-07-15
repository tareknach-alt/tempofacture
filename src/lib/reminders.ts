// Pas de 'server-only' : ce module est appelé côté serveur (page Server),
// mais le client reçoit le résultat sérialisé, et les types ReminderEmail /
// ReminderLevel sont réutilisés par le Client Component. Les fonctions qui
// construisent l'email restent appelées côté serveur uniquement.

import type { Document, Client, FreelanceProfile } from '@/lib/generated/prisma/client'
import { formatCurrencyEUR, formatNumber } from '@/lib/calc'

type LateInvoice = Document & { client: Client }

export type ReminderLevel = 'amicale' | 'ferme' | 'mise-en-demeure'

export type ReminderEmail = {
  to: string
  subject: string
  body: string
  level: ReminderLevel
}

/**
 * Génère un brouillon d'email de relance pré-rempli avec les données de la
 * facture et du client. Trois niveaux :
 *  - amicale : 1er rappel amical quelques jours après échéance
 *  - ferme   : 2e relance, ferme, rappel des pénalités légales
 *  - mise-en-demeure : mise en demeure formelle, fait courir les pénalités
 *
 * La facture PDF est téléchargeable séparément (route /api/documents/[id]/pdf)
 * et peut être joignée manuellement par le freelance.
 */
export function buildReminderEmail(
  doc: LateInvoice,
  profile: FreelanceProfile,
  level: ReminderLevel,
): ReminderEmail {
  const to = doc.client.email
  const amount = formatCurrencyEUR(Number(doc.totalTTC))
  const number = doc.number ?? ''
  const due = doc.dueDate ? new Intl.DateTimeFormat('fr-FR').format(new Date(doc.dueDate)) : '—'

  const now = new Date()
  const daysLate = doc.dueDate
    ? Math.floor((now.getTime() - new Date(doc.dueDate).getTime()) / (24 * 60 * 60 * 1000))
    : 0

  const profileName = profile.displayName || profile.legalName
  const penaltyRate = formatNumber(Number(profile.latePenaltyRate))
  const recoveryFix = profile.recoveryPriceFix ? formatCurrencyEUR(Number(profile.recoveryPriceFix)) : null

  if (level === 'amicale') {
    return {
      to,
      level,
      subject: `Relance amicale — Facture ${number}`,
      body: `Bonjour,

Je me permets de vous relancer concernant ma facture ${number} d'un montant de ${amount}, qui devait être réglée pour le ${due}.

Il est possible que ce courrier ait croisé votre règlement. Si c'est le cas, je vous prie de bien vouloir considérer cette relance comme sans objet.

À défaut, je vous remercie par avance de procéder au règlement dans les meilleurs délais.

Bien cordialement,
${profileName}`,
    }
  }

  if (level === 'ferme') {
    const mentionPenalty =
      Number(profile.latePenaltyRate) > 0
        ? `\n\nÀ titre de rappel, et conformément à nos conditions de vente, tout retard de paiement entraîne des pénalités de retard calculées au taux de ${penaltyRate} % par mois, ainsi qu'une indemnité forfaitaire de recouvrement${recoveryFix ? ` de ${recoveryFix}` : ''}.`
        : ''

    return {
      to,
      level,
      subject: `2e relance — Facture ${number}`,
      body: `Bonjour,

Malgré une première relance de ma part, la facture ${number}, d'un montant de ${amount} et échue le ${due}, reste impayée à ce jour (soit ${daysLate} jours de retard).

Je vous invite à procéder à son règlement dans un délai de 8 jours.${mentionPenalty}

À défaut de règlement unter eindélai, je me verrai contraint(e) d'envisager les voies légales appropriées.

En attendant votre retour rapide, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées,
${profileName}`,
    }
  }

  // mise-en-demeure
  return {
    to,
    level,
    subject: `MISE EN DEMEURE — Facture ${number}`,
    body: `Madame, Monsieur,

Par la présente, je vous mets en demeure de me régler la facture ${number} d'un montant de ${amount}, échue le ${due} et dont le retard est aujourd'hui de ${daysLate} jours.

Cette mise en demeure fait courir les pénalités de retard au taux de ${penaltyRate} % par mois${recoveryFix ? `, ainsi que l'indemnité forfaitaire de recouvrement de ${recoveryFix}` : ''}, conformément aux articles L441-10 et L441-12 du Code de commerce.

À défaut de règlement sous huitaine, je saisirai la juridiction compétente pour obtenir le paiement, dommages et intérêts, et frais exposés.

Pour régler ce litige et éviter cette procédure, je vous remercie de bien vouloir me régler la somme due. Les coordonnées bancaires figurent sur la facture en pièce jointe.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées,
${profileName}`,
  }
}