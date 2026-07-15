import assert from 'node:assert'
import { computeLine, computeTotals, formatCurrencyEUR } from '../src/lib/calc'

let l = computeLine({ quantity: 2, unitPriceHT: 100, vatRate: 20 })
assert.strictEqual(l.lineHT, 200)
assert.strictEqual(l.lineTVA, 40)
assert.strictEqual(l.lineTTC, 240)
console.log('OK ligne simple 2x100 HT 20% -> HT=200 TVA=40 TTC=240')

l = computeLine({ quantity: 3, unitPriceHT: 1.005, vatRate: 20 })
assert.strictEqual(l.lineHT, 3.02)
assert.strictEqual(l.lineTVA, 0.6)
assert.strictEqual(l.lineTTC, 3.62)
console.log('OK arrondi ligne 3x1.005 HT 20% -> HT=3.02 TVA=0.60 TTC=3.62')

const t = computeTotals([
  { quantity: 1, unitPriceHT: 100, vatRate: 20 },
  { quantity: 2, unitPriceHT: 50, vatRate: 10 },
])
assert.strictEqual(t.totalHT, 200)
assert.strictEqual(t.totalTVA, 30)
assert.strictEqual(t.totalTTC, 230)
assert.strictEqual(t.byVatRate.length, 2)
console.log('OK totaux doc -> HT=200 TVA=30 TTC=230 (recap TVA 2 taux)')

assert.strictEqual(formatCurrencyEUR(1234.5), '1\u202F234,50\u00A0€')
console.log('OK formatCurrencyEUR(1234.5) -> 1 234,50 EUR (separateur insécable)')

console.log('\nOK Tests unitaires de calcul - tous verts.')