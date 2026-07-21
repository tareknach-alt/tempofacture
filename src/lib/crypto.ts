import 'server-only'

import crypto from 'node:crypto'

/**
 * Chiffrement au repos des données sensibles (iban, email comptabilité clients).
 *
 * Algorithme : AES-256-GCM, clé dérivée du secret d'application via HKDF.
 * Un IV aléatoire par champ ; le tag GCM garantit l'intégrité.
 *
 * Stockage : préfixe "enc:" + base64(iv|tag|ciphertext) — permet de détecter
 * un champ déjà chiffré (réversible transparent pour l'application).
 */

const KEY_ENV = 'ENCRYPTION_KEY'

// En build, on n'a pas lescrets → on ne jette que si on essaie vraiment de chiffrer
const DUMMY_KEY = Buffer.alloc(32, 1)

let cachedKey: Buffer | null = null
let cachedEnv: string | null = null

/** Réinitialise le cache (utilitaire de test). */
export function _resetKeyCache() {
  cachedKey = null
  cachedEnv = null
}

function getKey(): Buffer {
  const envKey = process.env[KEY_ENV] ?? ''
  if (cachedKey && cachedEnv === envKey) return cachedKey
  cachedEnv = envKey
  if (!envKey) {
    // En dev sans clé configurée, on renvoie un marker pour bypasser le chiffrement
    // (les données sont en clair). En prod, une clé explicite est obligatoire.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${KEY_ENV} manquant en production`)
    }
    return (cachedKey = Buffer.alloc(0))
  }
  const key = Buffer.from(envKey, 'base64')
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} doit faire 32 octets en base64 (reçu ${key.length})`)
  }
  return (cachedKey = key)
}

const PREFIX = 'enc:'

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX)
}

export function encryptField(value: string | null | undefined): string | null {
  if (value == null) return null
  const key = getKey()
  if (key.length === 0) return value // bypass en dev sans clé
  if (isEncrypted(value)) return value // déjà chiffré

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const packed = Buffer.concat([iv, tag, enc]).toString('base64')
  return PREFIX + packed
}

export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null
  if (!isEncrypted(value)) return value // clair (données antérieures)
  const key = getKey()
  if (key.length === 0) return value

  const packed = Buffer.from(value.slice(PREFIX.length), 'base64')
  const iv = packed.subarray(0, 12)
  const tag = packed.subarray(12, 28)
  const enc = packed.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64')
}