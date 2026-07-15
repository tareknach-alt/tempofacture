<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tempofacture — Commandes du projet

- `npm run dev` — serveur de développement (http://localhost:3000)
- `npm run build` — build de production
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit` (vérification des types)
- `npm run db:migrate` — applique une migration Prisma après changement de schéma
- `npm run db:generate` — régénère le client Prisma (vers `src/lib/generated/prisma`)
- `npm run db:reset` — réinitialise la base (destructif)

### Architecture
- **Front/Back** : Next.js 16 (App Router, Server Components + Server Actions), src/app
- **DB** : PostgreSQL + Prisma 7 (schéma `prisma/schema.prisma`, adapter `@prisma/adapter-pg`)
- **Auth** : sessions JWT stateless (jose) en cookies httpOnly, proxy.ts (middleware renommé en Proxy sous Next 16) protège les routes
- **Validation** : Zod côté serveur dans `src/lib/validations.ts`

### Conventions Next.js 16 importantes
- `params` (pages/route handlers) est une `Promise` : `await params`
- `cookies()` / `headers()` sont asynchrones : `await cookies()`
- Middleware s'appelle **Proxy** : fichier `src/proxy.ts`
- Objets `Decimal` Prisma ne peuvent pas être passés à un Client Component — sérialiser en string d'abord
