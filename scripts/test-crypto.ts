import 'dotenv/config'
import assert from 'node:assert'
import crypto from 'node:crypto'
import { encryptField, decryptField, isEncrypted, generateEncryptionKey } from '../src/lib/crypto'
import * as c from '../src/lib/crypto'
const PREFIX = 'enc:'

async function main() {
  process.env.ENCRYPTION_KEY = generateEncryptionKey()
  c._resetKeyCache()

  // 1. Chiffrement + déchiffrement round-trip
  const orig = 'FR7630006000011234567890189'
  const enc = c.encryptField(orig)
  if (!enc) throw new Error('encryptField retourné null')
  assert.notStrictEqual(enc, orig, 'Le texte chiffré doit différer du clair')
  assert.ok(c.isEncrypted(enc), 'Le texte chiffré doit porter le préfixe enc:')
  console.log('OK chiffrement : IBAN clair -> prefixe enc: + base64')

  const dec = c.decryptField(enc)
  assert.strictEqual(dec, orig)
  console.log('OK dechiffrement : valeur identique a l\\originale')

  // 2. IV aleatoire : 2 chiffrements du meme clair donnent des chiffres differents
  const enc2 = c.encryptField(orig)
  assert.notStrictEqual(enc, enc2, 'IV doit differer entre chiffrements')
  assert.strictEqual(c.decryptField(enc2), orig)
  console.log('OK IV aleatoire : 2 cipher differents pour meme clair, decryptables')

  // 3. Integrite GCM : modifier un octet du ciphertext doit echouer
  const tamperedBase = Buffer.from(enc.slice(PREFIX.length), 'base64')
  tamperedBase[tamperedBase.length - 1] ^= 0xFF // flip dernier octet du ciphertext
  const tampered = PREFIX + tamperedBase.toString('base64')
  void enc // satisfying strict null checks
  let tamperThrew = false
  try {
    c.decryptField(tampered)
  } catch {
    tamperThrew = true
  }
  assert.ok(tamperThrew, 'Tamper doit jeterr (auth GCM)')
  console.log('OK integrite GCM : tamper du ciphertext provoque une erreur')

  // 4. Bypass en dev sans clé : données restées en clair
  delete process.env.ENCRYPTION_KEY
  c._resetKeyCache()
  const bypass = c.encryptField('sensible')
  assert.strictEqual(bypass, 'sensible', 'Dev sans clé doit bypasser (clair)')
  assert.ok(!c.isEncrypted(bypass))
  console.log('OK bypass dev : sans ENCRYPTION_KEY, les données restent en clair')

  // 5. Production : clé absente doit jeter
  ;(process.env as Record<string, string>).NODE_ENV = 'production'
  c._resetKeyCache()
  assert.throws(() => c.encryptField('x'), /ENCRYPTION_KEY manquant/)
  console.log('OK sécurité prod : sans ENCRYPTION_KEY, le chiffrement jette')

  // Restore env
  ;(process.env as Record<string, string>).NODE_ENV = 'development'
  c._resetKeyCache()

  console.log('\n✅ Tests de sécurité — chiffrement au repos validé.')
}

main().catch((e) => { console.error('\n❌ ÉCHEC :', e.message); process.exitCode = 1 })