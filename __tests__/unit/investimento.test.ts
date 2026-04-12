import { describe, it, expect } from 'vitest'
import {
  calcPGBLAliqRegressiva,
  calcPGBLAliqProgressiva,
  simulaInvestimentoLongoPrazo,
  formatBRL,
  PGBL_TABELA_REGRESSIVA,
  INVESTMENT_PRESETS,
  RENDA_FIXA_IR,
  type InvestmentParams,
} from '@/lib/investimento'

// ---------------------------------------------------------------------------
// 1. calcPGBLAliqRegressiva
// ---------------------------------------------------------------------------
describe('calcPGBLAliqRegressiva', () => {
  it.each([
    [1, 0.35],
    [2, 0.35],
    [3, 0.30],
    [4, 0.30],
    [5, 0.25],
    [6, 0.25],
    [7, 0.20],
    [8, 0.20],
    [9, 0.15],
    [10, 0.15],
    [11, 0.10],
    [15, 0.10],
    [30, 0.10],
  ])('anos = %i should return %f', (anos, expected) => {
    expect(calcPGBLAliqRegressiva(anos)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// 2. calcPGBLAliqProgressiva
// ---------------------------------------------------------------------------
describe('calcPGBLAliqProgressiva', () => {
  it('returns 0 for valorResgate = 0', () => {
    expect(calcPGBLAliqProgressiva(0)).toBe(0)
  })

  it('returns 0 for negative valorResgate', () => {
    expect(calcPGBLAliqProgressiva(-100)).toBe(0)
  })

  it('returns 0 for exempt bracket (29145.60)', () => {
    expect(calcPGBLAliqProgressiva(29145.60)).toBe(0)
  })

  it('computes correct effective rate for second bracket (33919.80)', () => {
    const valor = 33919.80
    const expected = (valor * 0.075 - 2185.92) / valor
    expect(calcPGBLAliqProgressiva(valor)).toBeCloseTo(expected, 10)
  })

  it('computes correct effective rate for top bracket (100000)', () => {
    const valor = 100000
    const expected = (valor * 0.275 - 10904.66) / valor
    expect(calcPGBLAliqProgressiva(valor)).toBeCloseTo(expected, 10)
  })

  it('result is always between 0 and 0.275', () => {
    const testValues = [0, 1, 1000, 29145.60, 33919.80, 45012.60, 55976.16, 100000, 1_000_000]
    for (const v of testValues) {
      const rate = calcPGBLAliqProgressiva(v)
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(0.275)
    }
  })
})

// ---------------------------------------------------------------------------
// 3. simulaInvestimentoLongoPrazo
// ---------------------------------------------------------------------------
describe('simulaInvestimentoLongoPrazo', () => {
  const baseParams: InvestmentParams = {
    aporteAnualPGBL: 17280,
    aporteMinimoPGBL: 5000,
    saldoAtualPGBL: 0,
    rendimentoPGBL: 12,
    rendimentoAlternativo: 14.75,
    irSobreLucroAlt: 0.15,
    tabelaPGBL: 'regressiva',
    horizonteAnos: 15,
    aliquotaMarginalIR: 0.165,
  }

  it('returns array of length equal to horizonteAnos', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    expect(result).toHaveLength(15)
  })

  it('first year pgblAportesAcum equals aporteAnualPGBL', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    expect(result[0].pgblAportesAcum).toBe(17280)
  })

  it('each year pgblSaldo is greater than previous year', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].pgblSaldo).toBeGreaterThan(result[i - 1].pgblSaldo)
    }
  })

  it('pgblAliqResgate decreases over time (regressiva)', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    expect(result[0].pgblAliqResgate).toBe(0.35)
    expect(result[result.length - 1].pgblAliqResgate).toBe(0.10)

    // Non-increasing over time
    for (let i = 1; i < result.length; i++) {
      expect(result[i].pgblAliqResgate).toBeLessThanOrEqual(result[i - 1].pgblAliqResgate)
    }
  })

  it('pgblLiquido = pgblSaldo - pgblIRResgate', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    for (const row of result) {
      expect(row.pgblLiquido).toBeCloseTo(row.pgblSaldo - row.pgblIRResgate, 6)
    }
  })

  it('pgblTotalReal = pgblLiquido + pgblBeneficioIRAcum', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    for (const row of result) {
      expect(row.pgblTotalReal).toBeCloseTo(row.pgblLiquido + row.pgblBeneficioIRAcum, 6)
    }
  })

  it('mixAltAportesAcum increases by (aporteAnualPGBL - aporteMinimoPGBL) each year', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    const aporteAlt = 17280 - 5000
    for (let i = 0; i < result.length; i++) {
      expect(result[i].mixAltAportesAcum).toBe(aporteAlt * (i + 1))
    }
  })

  it('mixTotalLiquido = (mixPgblSaldo - mixPgblIR) + (mixAltSaldo - mixAltIR)', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    for (const row of result) {
      const expected = (row.mixPgblSaldo - row.mixPgblIR) + (row.mixAltSaldo - row.mixAltIR)
      expect(row.mixTotalLiquido).toBeCloseTo(expected, 6)
    }
  })

  it('year 1 pgblSaldo = (0 + 17280) * 1.12', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    expect(result[0].pgblSaldo).toBeCloseTo(17280 * 1.12, 6)
  })

  it('year 1 mixAltSaldo = (0 + 12280) * 1.1475', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    expect(result[0].mixAltSaldo).toBeCloseTo(12280 * 1.1475, 6)
  })

  it('year 1 pgblAliqResgate = 0.35 (<=2 years)', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    expect(result[0].pgblAliqResgate).toBe(0.35)
  })

  it('after 10+ years pgblAliqResgate should be 0.10', () => {
    const result = simulaInvestimentoLongoPrazo(baseParams)
    for (let i = 10; i < result.length; i++) {
      expect(result[i].pgblAliqResgate).toBe(0.10)
    }
  })

  // Progressive table
  it('progressiva: pgblAliqResgate varies with saldo', () => {
    const paramsProgr: InvestmentParams = { ...baseParams, tabelaPGBL: 'progressiva' }
    const result = simulaInvestimentoLongoPrazo(paramsProgr)

    for (const row of result) {
      const expectedAliq = calcPGBLAliqProgressiva(row.pgblSaldo)
      expect(row.pgblAliqResgate).toBeCloseTo(expectedAliq, 10)
    }
  })

  // Initial balance
  it('saldoAtualPGBL > 0 compounds correctly', () => {
    const paramsWithSaldo: InvestmentParams = { ...baseParams, saldoAtualPGBL: 50000 }
    const result = simulaInvestimentoLongoPrazo(paramsWithSaldo)
    // Year 1: (50000 + 17280) * 1.12
    expect(result[0].pgblSaldo).toBeCloseTo((50000 + 17280) * 1.12, 6)
  })

  // Tax-free alternative
  it('isento alternative: mixAltIR is always 0', () => {
    const paramsIsento: InvestmentParams = { ...baseParams, irSobreLucroAlt: 0 }
    const result = simulaInvestimentoLongoPrazo(paramsIsento)
    for (const row of result) {
      expect(row.mixAltIR).toBe(0)
    }
  })

  // Edge: horizonteAnos = 1
  it('horizonteAnos = 1 returns a single-element array', () => {
    const paramsShort: InvestmentParams = { ...baseParams, horizonteAnos: 1 }
    const result = simulaInvestimentoLongoPrazo(paramsShort)
    expect(result).toHaveLength(1)
    expect(result[0].ano).toBe(1)
  })

  // Edge: aporteMinimoPGBL = 0
  it('aporteMinimoPGBL = 0 means all goes to alternative', () => {
    const paramsNoMin: InvestmentParams = { ...baseParams, aporteMinimoPGBL: 0 }
    const result = simulaInvestimentoLongoPrazo(paramsNoMin)
    // mixPgblSaldo should equal saldoAtualPGBL compounded with 0 contrib
    // Year 1: (0 + 0) * 1.12 = 0
    expect(result[0].mixPgblSaldo).toBeCloseTo(0, 6)
    // mixAltAportesAcum = aporteAnualPGBL * year
    expect(result[0].mixAltAportesAcum).toBe(17280)
  })

  // Edge: aporteAnualPGBL = aporteMinimoPGBL (no alt investment)
  it('aporteAnualPGBL === aporteMinimoPGBL means no alternative investment', () => {
    const paramsEqual: InvestmentParams = {
      ...baseParams,
      aporteAnualPGBL: 5000,
      aporteMinimoPGBL: 5000,
    }
    const result = simulaInvestimentoLongoPrazo(paramsEqual)
    for (const row of result) {
      expect(row.mixAltSaldo).toBe(0)
      expect(row.mixAltAportesAcum).toBe(0)
      expect(row.mixAltIR).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. formatBRL
// ---------------------------------------------------------------------------
describe('formatBRL', () => {
  it('formats 1234.56 as R$ 1.234,56', () => {
    expect(formatBRL(1234.56)).toBe('R$ 1.234,56')
  })

  it('formats 0 as R$ 0,00', () => {
    expect(formatBRL(0)).toBe('R$ 0,00')
  })

  it('formats -500 as R$ -500,00', () => {
    expect(formatBRL(-500)).toBe('R$ -500,00')
  })

  it('formats 1000000 as R$ 1.000.000,00', () => {
    expect(formatBRL(1000000)).toBe('R$ 1.000.000,00')
  })
})

// ---------------------------------------------------------------------------
// 5. Constants validation
// ---------------------------------------------------------------------------
describe('constants', () => {
  it('PGBL_TABELA_REGRESSIVA has 6 entries with last ateAnos = Infinity and aliq = 0.10', () => {
    expect(PGBL_TABELA_REGRESSIVA).toHaveLength(6)
    const last = PGBL_TABELA_REGRESSIVA[PGBL_TABELA_REGRESSIVA.length - 1]
    expect(last.ateAnos).toBe(Infinity)
    expect(last.aliq).toBe(0.10)
  })

  it('INVESTMENT_PRESETS has 7 entries including personalizado', () => {
    const keys = Object.keys(INVESTMENT_PRESETS)
    expect(keys).toHaveLength(7)
    expect(keys).toContain('personalizado')
  })

  it('RENDA_FIXA_IR has 4 entries', () => {
    expect(RENDA_FIXA_IR).toHaveLength(4)
  })
})
