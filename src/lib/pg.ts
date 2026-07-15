import 'server-only'
import pg from 'pg'

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://nach@localhost:5432/tempofacture?schema=public'

export const pool = new pg.Pool({ connectionString })

export type { pg }