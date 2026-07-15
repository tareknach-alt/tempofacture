# Tempofacture

Outil de facturation web sur-mesure pour activité freelance de **Formation et Coaching**.
Conforme aux obligations légales françaises : mentions obligatoires, numérotation
inaltérable, facturation électronique **Factur-X** (norme **EN 16931**, PDF/A-3).

## Stack technique

- **Frontend + Backend** : Next.js 16 (App Router, Server Components + Server Actions), TypeScript
- **Base de données** : PostgreSQL + Prisma 7 (adapter `@prisma/adapter-pg`)
- **Auth** : sessions JWT stateless (jose) en cookies httpOnly, `proxy.ts` protège les routes
- **Validation** : Zod côté serveur (`src/lib/validations.ts`)
- **PDF** : `pdf-lib` + XML Factur-X (EN 16931) embarqué en **PDF/A-3**
- **Cron** : `scripts/cron-detect-late.ts` — détection quotidienne des factures en retard

## Démarrage

### Prérequis
- Node.js 24+
- PostgreSQL 16+ (local ou Docker)

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env :
#   DATABASE_URL="postgresql://<user>@localhost:5432/tempofacture?schema=public"
#   SESSION_SECRET="<openssl rand -base64 32>"
#   ENCRYPTION_KEY="<node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">"

# 3. Créer la base PostgreSQL
createdb tempofacture

# 4. Appliquer le schéma Prisma + fonctions SQL de numérotation
npm run db:migrate
psql $DATABASE_URL -f prisma/migrations/*/sequences.sql

# 5. Générer le client Prisma
npm run db:generate

# 6. Lancer le serveur de développement
npm run dev
# → http://localhost:3000  (premier accès : /setup pour créer le compte admin)
```

## Commandes

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (Next.js 16) |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Applique une migration Prisma |
| `npm run db:generate` | Régénère le client Prisma |
| `npm run db:reset` | Réinitialise la base (destructif) |

### Scripts & tests

| Fichier | Description |
|---|---|
| `scripts/test-calc.ts` | Tests unitaires des calculs HT/TVA/TTC |
| `scripts/test-phase2.ts` | Tests Phase 2 : numérotation, conversion, PDF |
| `scripts/test-phase3.ts` | Tests Phase 3 : XML Factur-X, PDF/A-3, avoirs |
| `scripts/test-phase4.ts` | Tests Phase 4 : dashboard, cron retards, relances |
| `scripts/test-crypto.ts` | Tests de sécurité (chiffrement au repos) |
| `scripts/cron-detect-late.ts` | Cron quotidien de détection des retards |
| `scripts/archive-year.ts` | Export annuel JSON pour archivage légal |
| `scripts/audit-legal.ts` | Audit de conformité légale |

Lancer tous les tests :

```bash
# Stub server-only pour tsx
echo 'module.exports = {}' > node_modules/server-only/index.js
npx tsx scripts/test-calc.ts
npx tsx scripts/test-phase2.ts
npx tsx scripts/test-phase3.ts
npx tsx scripts/test-phase4.ts
npx tsx scripts/test-crypto.ts
```

## Architecture

```
src/
├── app/                      # App Router Next.js
│   ├── (app)/                # Groupe de routes authentifiées
│   │   ├── tableau-de-bord/  # Dashboard CA, retards
│   │   ├── clients/          # CRUD clients
│   │   ├── documents/        # Devis, factures, avoirs
│   │   │   ├── [id]/         # Détail d'un document
│   │   │   └── new/          # Création
│   │   ├── relancer/[id]/    # Générateur d'emails de relance
│   │   └── profil/           # Profil freelance
│   ├── api/documents/[id]/pdf/  # Route handler PDF (avec XML Factur-X)
│   ├── login/                # Page d'authentification
│   └── setup/                # Premier utilisateur
├── actions/                  # Server Actions (auth, profile, clients, documents, reminders, cron)
├── components/               # Composants UI (formulaire, bouton, sidebar)
├── lib/
│   ├── db.ts                 # Singleton PrismaClient (adapter pg)
│   ├── pg.ts                 # Pool pg natif (séquences SQL)
│   ├── session.ts            # JWT (jose) — encrypt/decrypt, cookies
│   ├── dal.ts                # Data Access Layer (verifySession, getCurrentUser)
│   ├── validations.ts        # Schémas Zod
│   ├── calc.ts               # Calculs HT/TVA/TTC (arrondi ligne par ligne)
│   ├── numeration.ts         # Numérotation séquentielle atomique (PostgreSQL)
│   ├── pdf.ts                # Génération PDF (pdf-lib)
│   ├── facturx.ts            # XML Factur-X (EN 16931)
│   ├── pdfa3.ts              # Embbarquement XML → PDF/A-3
│   ├── reminders.ts          # Templates d'emails de relance (3 niveaux)
│   └── crypto.ts             # Chiffrement au repos (AES-256-GCM)
└── proxy.ts                  # Middleware Next.js 16 (auth check)
```

## Conformité légale française

### Mentions obligatoires sur factures
- SIRET, raison sociale, statut juridique, capital social (si société)
- TVA intracommunautaire (si applicable)
- Délai de paiement, pénalités de retard (taux), indemnité forfaitaire de recouvrement
- Mentions spécifiques **organisme de formation** : n° de déclaration, Qualiopi
- IBAN / BIC pour le règlement

### Inaltérabilité
- Numérotation séquentielle et continue via `next_document_sequence()` PostgreSQL
- Aucune modification possible d'un document verrouillé (`status != DRAFT`)
- Suppression impossible hors statut brouillon

### Facturation électronique obligatoire (loi 26/09/2026)
- PDF généré au format **PDF/A-3B** (pdf-lib + embedded file)
- XML **Factur-X** (norme EN 16931, profil BASIC) embarqué comme pièce jointe
- Validation : `xmllint` (XML bien formé) ; pour la conformité audit, exécuter
  [`mustang`](https://github.com/ZUGFeRD/mustangproject) ou `veraPDF` sur les PDF
  générés

### Conservation & archivage
- Conservation en base PostgreSQL : aucune suppression post-émission
- Export annuel JSON : `npx tsx scripts/archive-year.ts 2026`
- Conservation légale : 10 ans (art. L123-22 Code de commerce, art. 1029 CGI)

## Sécurité

- Auth : sessions JWT signées (HS256) en cookies `httpOnly`, `sameSite=lax`, `secure` en prod
- Routes API et Server Actions protégées par `verifySession()` (DAL)
- Données sensibles chiffrées au repos (AES-256-GCM) : IBAN, email comptabilité
- Validation serveur sur tous les inputs (Zod)
- `SESSION_SECRET` et `ENCRYPTION_KEY` secrets obligatoires en production

## Déploiement

### Vercel + Supabase (recommandé)
1. Créer une base Supabase PostgreSQL
2. Configurer `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY` en secrets Vercel
3. `psql $DATABASE_URL -f prisma/migrations/*/sequences.sql` une fois en post-deploy
4. Vercel Cron : `0 8 * * *` → `npx tsx scripts/cron-detect-late.ts`

### Docker / VPS
- Build : `npm run build && npm run start`
- Reverse-proxy (nginx) + Let's Encrypt pour HTTPS
- Cron physique : `0 8 * * *  cd /app && npx tsx scripts/cron-detect-late.ts >> /var/log/cron.log 2>&1`