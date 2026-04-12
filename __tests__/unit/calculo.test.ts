import { describe, it, expect } from 'vitest';
import {
  BRL,
  PCT,
  parseVal,
  calcINSS,
  calcINSSDetalhado,
  calcIRPF,
  calcIRRFMensal,
  simulaPGBL,
  findAporteMinimo,
  INSS_TETO_MENSAL,
  INSS_FAIXAS,
  IRPF_FAIXAS,
  DESC_SIMPLIFICADO_TETO,
  type SimState,
} from '@/lib/calculo';

// ---------------------------------------------------------------------------
// 1. BRL — Brazilian Real formatting
// ---------------------------------------------------------------------------
describe('BRL', () => {
  it('formats zero', () => {
    expect(BRL(0)).toBe('R$ 0,00');
  });

  it('formats a typical value with thousands separator', () => {
    expect(BRL(1234.56)).toBe('R$ 1.234,56');
  });

  it('uses Math.abs for negative values', () => {
    expect(BRL(-500)).toBe('R$ 500,00');
  });

  it('formats millions correctly', () => {
    expect(BRL(1000000)).toBe('R$ 1.000.000,00');
  });

  it('formats small decimal value', () => {
    expect(BRL(0.99)).toBe('R$ 0,99');
  });
});

// ---------------------------------------------------------------------------
// 2. PCT — Percentage formatting
// ---------------------------------------------------------------------------
describe('PCT', () => {
  it('formats zero', () => {
    expect(PCT(0)).toBe('0,00%');
  });

  it('formats 15.5', () => {
    expect(PCT(15.5)).toBe('15,50%');
  });

  it('formats 27.5', () => {
    expect(PCT(27.5)).toBe('27,50%');
  });

  it('formats 100', () => {
    expect(PCT(100)).toBe('100,00%');
  });
});

// ---------------------------------------------------------------------------
// 3. parseVal — Parse BR currency string
// ---------------------------------------------------------------------------
describe('parseVal', () => {
  it('parses typical BR currency string', () => {
    expect(parseVal('1.234,56')).toBe(1234.56);
  });

  it('parses zero', () => {
    expect(parseVal('0,00')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseVal('')).toBe(0);
  });

  it('parses value with thousands separator', () => {
    expect(parseVal('12.000,00')).toBe(12000);
  });

  it('parses integer-like value', () => {
    expect(parseVal('500,00')).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 4. calcINSS — INSS progressive calculation
// ---------------------------------------------------------------------------
describe('calcINSS', () => {
  it('returns 0 for salary 0', () => {
    expect(calcINSS(0)).toBe(0);
  });

  it('calculates first bracket only (salary = 1621)', () => {
    const expected = 1621 * 0.075;
    expect(calcINSS(1621)).toBeCloseTo(expected, 2);
  });

  it('calculates across 2 brackets (salary = 2902.84)', () => {
    const f1 = 1621 * 0.075;
    const f2 = (2902.84 - 1621) * 0.09;
    expect(calcINSS(2902.84)).toBeCloseTo(f1 + f2, 2);
  });

  it('calculates across 3 brackets (salary = 4354.27)', () => {
    const f1 = 1621 * 0.075;
    const f2 = (2902.84 - 1621) * 0.09;
    const f3 = (4354.27 - 2902.84) * 0.12;
    expect(calcINSS(4354.27)).toBeCloseTo(f1 + f2 + f3, 2);
  });

  it('returns teto for salary at ceiling (8475.55)', () => {
    expect(calcINSS(8475.55)).toBeCloseTo(INSS_TETO_MENSAL, 0);
  });

  it('returns teto for salary above ceiling (10000)', () => {
    expect(calcINSS(10000)).toBeCloseTo(INSS_TETO_MENSAL, 0);
  });

  it('calculates across 3 brackets for salary 3000', () => {
    const f1 = 1621 * 0.075;
    const f2 = (2902.84 - 1621) * 0.09;
    const f3 = (3000 - 2902.84) * 0.12;
    expect(calcINSS(3000)).toBeCloseTo(f1 + f2 + f3, 2);
  });

  it('calculates across 4 brackets for salary 5000', () => {
    const f1 = 1621 * 0.075;
    const f2 = (2902.84 - 1621) * 0.09;
    const f3 = (4354.27 - 2902.84) * 0.12;
    const f4 = (5000 - 4354.27) * 0.14;
    expect(calcINSS(5000)).toBeCloseTo(f1 + f2 + f3 + f4, 2);
  });
});

// ---------------------------------------------------------------------------
// 5. calcINSSDetalhado — INSS detailed breakdown
// ---------------------------------------------------------------------------
describe('calcINSSDetalhado', () => {
  it('returns empty faixas and total 0 for salary 0', () => {
    const result = calcINSSDetalhado(0);
    expect(result.faixas).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns 4 faixas for salary 5000', () => {
    const result = calcINSSDetalhado(5000);
    expect(result.faixas).toHaveLength(4);
    expect(result.faixas[0].aliq).toBe(0.075);
    expect(result.faixas[1].aliq).toBe(0.09);
    expect(result.faixas[2].aliq).toBe(0.12);
    expect(result.faixas[3].aliq).toBe(0.14);
    expect(result.total).toBeCloseTo(calcINSS(5000), 2);
  });

  it('returns 4 faixas and total equals teto for salary above ceiling', () => {
    const result = calcINSSDetalhado(10000);
    expect(result.faixas).toHaveLength(4);
    expect(result.total).toBeCloseTo(INSS_TETO_MENSAL, 0);
  });

  it('each faixa has correct base calculation', () => {
    const result = calcINSSDetalhado(3000);
    expect(result.faixas).toHaveLength(3);
    expect(result.faixas[0].de).toBe(0);
    expect(result.faixas[0].ate).toBe(1621);
    expect(result.faixas[0].base).toBeCloseTo(1621, 2);
    expect(result.faixas[1].de).toBe(1621);
    expect(result.faixas[1].ate).toBeCloseTo(2902.84, 2);
    expect(result.faixas[1].base).toBeCloseTo(2902.84 - 1621, 2);
    expect(result.faixas[2].de).toBeCloseTo(2902.84, 2);
    expect(result.faixas[2].ate).toBe(3000);
    expect(result.faixas[2].base).toBeCloseTo(3000 - 2902.84, 2);
  });

  it('total matches calcINSS for various salaries', () => {
    for (const sal of [1000, 2500, 4000, 6000, 8475.55, 15000]) {
      const det = calcINSSDetalhado(sal);
      expect(det.total).toBeCloseTo(calcINSS(sal), 2);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. calcIRPF — Annual IRPF with redutor
// ---------------------------------------------------------------------------
describe('calcIRPF', () => {
  it('returns 0 for base 0', () => {
    expect(calcIRPF(0)).toBe(0);
  });

  it('returns 0 for negative base', () => {
    expect(calcIRPF(-1000)).toBe(0);
  });

  it('returns 0 for base within first exempt bracket (29145.60)', () => {
    expect(calcIRPF(29145.60)).toBe(0);
  });

  it('returns 0 for base at redutor isento ceiling (50000)', () => {
    expect(calcIRPF(50000)).toBe(0);
  });

  it('returns 0 for base exactly at 60000 (redutor isento limit)', () => {
    expect(calcIRPF(60000)).toBe(0);
  });

  it('applies redutor for base between 60000 and 88200 (70000)', () => {
    // imposto = 70000 * 0.275 - 10904.66 = 19250 - 10904.66 = 8345.34
    const imposto = 70000 * 0.275 - 10904.66;
    // redutor = 8429.73 - 0.095575 * 70000 = 8429.73 - 6690.25 = 1739.48
    const redutor = 8429.73 - 0.095575 * 70000;
    const expected = imposto - redutor;
    expect(calcIRPF(70000)).toBeCloseTo(expected, 2);
  });

  it('no redutor for base at 88200', () => {
    const expected = 88200 * 0.275 - 10904.66;
    expect(calcIRPF(88200)).toBeCloseTo(expected, 2);
  });

  it('no redutor for base at 100000', () => {
    const expected = 100000 * 0.275 - 10904.66;
    expect(calcIRPF(100000)).toBeCloseTo(expected, 2);
  });

  it('no redutor for base at 144000', () => {
    const expected = 144000 * 0.275 - 10904.66;
    expect(calcIRPF(144000)).toBeCloseTo(expected, 2);
  });
});

// ---------------------------------------------------------------------------
// 7. calcIRRFMensal — Monthly IRRF
// ---------------------------------------------------------------------------
describe('calcIRRFMensal', () => {
  it('returns 0 for renda 0', () => {
    expect(calcIRRFMensal(0)).toBe(0);
  });

  it('returns 0 for renda below any threshold (2000)', () => {
    expect(calcIRRFMensal(2000)).toBe(0);
  });

  it('returns 0 for renda 3036 (gov.br example 1)', () => {
    // base = 3036 - INSS(3036) - 607.20 ~ 2428 or below, isenta
    expect(calcIRRFMensal(3036)).toBe(0);
  });

  it('returns 0 for renda 5000 (redutor zeros imposto)', () => {
    // Renda <= 5000: redutor mensal zera imposto
    expect(calcIRRFMensal(5000)).toBe(0);
  });

  it('calculates correctly for renda 6000 with redutor', () => {
    // base = 6000 - INSS(6000) - 607.20; redutor applied since 5000 < 6000 < 7350
    const result = calcIRRFMensal(6000);
    expect(result).toBeCloseTo(218.12, 0);
  });

  it('returns positive value for high income', () => {
    expect(calcIRRFMensal(12000)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 8. simulaPGBL — PGBL simulation
// ---------------------------------------------------------------------------
describe('simulaPGBL', () => {
  const testState: SimState = {
    rendaAnual: 144000,
    irrfAnual: 24000,
    inssAnual: 11857,
    deducaoDependentesAnual: 0,
    despMedAnual: 0,
    despEduAnual: 3561.50,
    pensaoAnual: 0,
    pgblMaxAnual: 17280,
    baseSemPGBL: 128581.50,
    impostoSemPGBL: calcIRPF(128581.50),
    prevAnualAtual: 0,
    impostoCompleto: 0,
    impostoSimplificado: 0,
    resultadoCompleto: 0,
    resultadoSimplificado: 0,
    melhorModelo: 'completo',
    descontoSimp: 17640,
    totalDeducoesAnual: 15418.50,
  };

  it('with pgbl = 0, impostoCompl matches calcIRPF of baseSemPGBL', () => {
    const result = simulaPGBL(testState, 0);
    const expectedBase = testState.rendaAnual - testState.inssAnual
      - testState.deducaoDependentesAnual - testState.despMedAnual
      - testState.despEduAnual - testState.pensaoAnual - 0;
    expect(result.baseCompl).toBeCloseTo(expectedBase, 2);
    expect(result.impostoCompl).toBeCloseTo(calcIRPF(expectedBase), 2);
  });

  it('with pgbl = 17280, base is reduced by 17280', () => {
    const result = simulaPGBL(testState, 17280);
    const expectedBase = testState.rendaAnual - testState.inssAnual
      - testState.deducaoDependentesAnual - testState.despMedAnual
      - testState.despEduAnual - testState.pensaoAnual - 17280;
    expect(result.baseCompl).toBeCloseTo(expectedBase, 2);
    expect(result.impostoCompl).toBeCloseTo(calcIRPF(expectedBase), 2);
  });

  it('selects melhor modelo correctly', () => {
    const result = simulaPGBL(testState, 17280);
    if (result.impostoCompl <= result.impostoSimp) {
      expect(result.melhor).toBe('completo');
    } else {
      expect(result.melhor).toBe('simplificado');
    }
  });

  it('resultFinal = impostoFinal - irrfAnual for completo', () => {
    const result = simulaPGBL(testState, 17280);
    if (result.melhor === 'completo') {
      expect(result.resultFinal).toBeCloseTo(result.impostoCompl - testState.irrfAnual, 2);
    } else {
      expect(result.resultFinal).toBeCloseTo(result.impostoSimp - testState.irrfAnual, 2);
    }
  });

  it('simplificado does not change with PGBL', () => {
    const r0 = simulaPGBL(testState, 0);
    const r1 = simulaPGBL(testState, 10000);
    expect(r0.impostoSimp).toBeCloseTo(r1.impostoSimp, 2);
  });

  it('impostoFinal is the minimum of completo and simplificado', () => {
    const result = simulaPGBL(testState, 8000);
    expect(result.impostoFinal).toBeCloseTo(
      Math.min(result.impostoCompl, result.impostoSimp), 2
    );
  });
});

// ---------------------------------------------------------------------------
// 9. findAporteMinimo — Binary search for minimum PGBL
// ---------------------------------------------------------------------------
describe('findAporteMinimo', () => {
  it('returns aporte 0 when result is already restituicao', () => {
    const st: SimState = {
      rendaAnual: 60000,
      irrfAnual: 10000,
      inssAnual: 7200,
      deducaoDependentesAnual: 0,
      despMedAnual: 0,
      despEduAnual: 0,
      pensaoAnual: 0,
      pgblMaxAnual: 7200,
      baseSemPGBL: 52800,
      impostoSemPGBL: 0,
      prevAnualAtual: 0,
      impostoCompleto: 0,
      impostoSimplificado: 0,
      resultadoCompleto: 0,
      resultadoSimplificado: 0,
      melhorModelo: 'completo',
      descontoSimp: 12000,
      totalDeducoesAnual: 7200,
    };
    const { aporte } = findAporteMinimo(st);
    expect(aporte).toBe(0);
  });

  it('finds aporte that makes result <= 0 when result is positive', () => {
    // Scenario: completo model with high medical deductions + PGBL can zero the result
    const st: SimState = {
      rendaAnual: 84000,
      irrfAnual: 5000,
      inssAnual: 11857,
      deducaoDependentesAnual: 0,
      despMedAnual: 5000,
      despEduAnual: 0,
      pensaoAnual: 0,
      pgblMaxAnual: 10080,
      baseSemPGBL: 67143,
      impostoSemPGBL: calcIRPF(67143),
      prevAnualAtual: 0,
      impostoCompleto: 0,
      impostoSimplificado: 0,
      resultadoCompleto: 0,
      resultadoSimplificado: 0,
      melhorModelo: 'completo',
      descontoSimp: 16800,
      totalDeducoesAnual: 16857,
    };
    // Verify that without PGBL the result is positive
    const semPGBL = simulaPGBL(st, 0);
    expect(semPGBL.resultFinal).toBeGreaterThan(0);

    const { aporte, resultado } = findAporteMinimo(st);
    expect(aporte).toBeGreaterThan(0);
    expect(resultado.resultFinal).toBeLessThanOrEqual(0);
  });

  it('returns aporte 0 when pgblMaxAnual is 0', () => {
    const st: SimState = {
      rendaAnual: 60000,
      irrfAnual: 0,
      inssAnual: 0,
      deducaoDependentesAnual: 0,
      despMedAnual: 0,
      despEduAnual: 0,
      pensaoAnual: 0,
      pgblMaxAnual: 0,
      baseSemPGBL: 60000,
      impostoSemPGBL: calcIRPF(60000),
      prevAnualAtual: 0,
      impostoCompleto: 0,
      impostoSimplificado: 0,
      resultadoCompleto: 0,
      resultadoSimplificado: 0,
      melhorModelo: 'completo',
      descontoSimp: 12000,
      totalDeducoesAnual: 0,
    };
    const { aporte } = findAporteMinimo(st);
    expect(aporte).toBe(0);
  });

  it('returned aporte is a multiple of 12', () => {
    const st: SimState = {
      rendaAnual: 84000,
      irrfAnual: 5000,
      inssAnual: 11857,
      deducaoDependentesAnual: 0,
      despMedAnual: 5000,
      despEduAnual: 0,
      pensaoAnual: 0,
      pgblMaxAnual: 10080,
      baseSemPGBL: 67143,
      impostoSemPGBL: calcIRPF(67143),
      prevAnualAtual: 0,
      impostoCompleto: 0,
      impostoSimplificado: 0,
      resultadoCompleto: 0,
      resultadoSimplificado: 0,
      melhorModelo: 'completo',
      descontoSimp: 16800,
      totalDeducoesAnual: 16857,
    };
    const { aporte } = findAporteMinimo(st);
    expect(aporte % 12).toBe(0);
  });
});

// ===========================================================================
// 10. Official gov.br Examples (Lei 15.270/2025)
// Source: https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-191-2025
// ===========================================================================
describe('Official gov.br Examples — IRRF Mensal (Lei 15.270/2025)', () => {
  // Note: Our calcIRRFMensal uses desconto simplificado (R$ 607,20) by default.
  // The gov.br examples use either desc. simplificado OR deducoes legais.
  // Examples 1-3 use desc. simplificado. Example 4 uses deducoes legais only.
  // We test examples 1-3 exactly, and example 4/5 for the INSS and redutor logic.

  it('Example 1: R$ 3.036 — aliquota zero', () => {
    // Rendimento: 3036, INSS calculated, desc simp 607.20, base ~2171 → isenta
    expect(calcIRRFMensal(3036)).toBe(0);
  });

  it('Example 2: R$ 4.000 — renda ate R$ 5.000, redutor zera', () => {
    // Renda <= 5000 → redutor zera qualquer imposto
    expect(calcIRRFMensal(4000)).toBe(0);
  });

  it('Example 3: R$ 5.000 — redutor R$ 312,89 zera imposto', () => {
    expect(calcIRRFMensal(5000)).toBe(0);
  });

  it('Example 4: R$ 6.000 — redutor parcial (com desc simplificado)', () => {
    // Our function uses desc simplificado, gov.br example uses deducoes legais
    // With desc simp: base = 6000 - INSS - 607.20, redutor applied
    const result = calcIRRFMensal(6000);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(400); // Less than gov.br example (382.88) due to desc simp
  });

  it('Example 5: R$ 7.607,20 — sem redutor', () => {
    // Renda > 7350 → no redutor applied
    const result = calcIRRFMensal(7607.20);
    expect(result).toBeGreaterThan(0);
  });

  it('Redutor formula: 978.62 - 0.133145 * renda (between 5001 and 7349)', () => {
    // At renda 5001: redutor = 978.62 - 0.133145*5001 = 312.7559... (almost full)
    // Imposto should be very close to 0
    const result = calcIRRFMensal(5001);
    expect(result).toBeCloseTo(0, 0);
  });

  it('Redutor boundary: renda 7350 — redutor is 0', () => {
    // redutor = 978.62 - 0.133145 * 7350 = 978.62 - 978.6158 = 0.0042
    // Effectively no redutor
    const result = calcIRRFMensal(7350);
    expect(result).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 11. INSS official verification against manual progressive calculation
// ===========================================================================
describe('INSS official progressive verification', () => {
  it('matches manual bracket-by-bracket calculation for R$ 5.000', () => {
    // Bracket 1: 1621 * 7.5% = 121.575
    // Bracket 2: (2902.84 - 1621) * 9% = 115.3656
    // Bracket 3: (4354.27 - 2902.84) * 12% = 174.1716
    // Bracket 4: (5000 - 4354.27) * 14% = 90.4022
    const expected = 121.575 + 115.3656 + 174.1716 + 90.4022;
    expect(calcINSS(5000)).toBeCloseTo(expected, 2);
  });

  it('matches manual calculation at exact teto (R$ 8.475,55)', () => {
    // Bracket 1: 1621 * 7.5% = 121.575
    // Bracket 2: 1281.84 * 9% = 115.3656
    // Bracket 3: 1451.43 * 12% = 174.1716
    // Bracket 4: 4121.28 * 14% = 576.9792
    const expected = 121.575 + 115.3656 + 174.1716 + 576.9792;
    expect(calcINSS(8475.55)).toBeCloseTo(expected, 1);
    expect(calcINSS(8475.55)).toBeCloseTo(988.09, 0);
  });
});

// ===========================================================================
// 12. IRPF annual — full bracket verification
// ===========================================================================
describe('IRPF annual bracket verification', () => {
  it('exact boundary: R$ 29.145,60 — top of exempt bracket', () => {
    expect(calcIRPF(29145.60)).toBe(0);
  });

  it('R$ 29.145,61 — enters 7.5% bracket, but redutor zeros it', () => {
    // Still below 60000 → redutor zeros imposto
    expect(calcIRPF(29145.61)).toBe(0);
  });

  it('R$ 33.919,80 — top of 7.5% bracket, still below redutor threshold', () => {
    // 33919.80 * 0.075 - 2185.92 = 357.065
    // But 33919.80 < 60000 → redutor zeros it
    expect(calcIRPF(33919.80)).toBe(0);
  });

  it('R$ 55.976,16 — top of 22.5% bracket, but below 60k redutor threshold', () => {
    // 55976.16 < 60000 (REDUTOR_BASE_ISENTO) → redutor zeros imposto
    expect(calcIRPF(55976.16)).toBe(0);
  });

  it('R$ 65.000 — within redutor zone (60k-88.2k), redutor partially reduces', () => {
    // Imposto: 65000 * 0.275 - 10904.66 = 6970.34
    // Redutor: 8429.73 - 0.095575 * 65000 = 2217.355
    // Final: 6970.34 - 2217.355 = 4752.985
    expect(calcIRPF(65000)).toBeCloseTo(4752.99, 0);
  });

  it('R$ 88.200 — exactly at redutor boundary (no redutor)', () => {
    // 88200 * 0.275 - 10904.66 = 13350.34
    // At boundary: redutor formula = 8429.73 - 0.095575*88200 = 0.015 (effectively 0)
    // But code uses < (not <=) so no redutor at exactly 88200
    const result = calcIRPF(88200);
    expect(result).toBeCloseTo(13350.34, 0);
  });

  it('above all brackets: R$ 200.000', () => {
    // 200000 * 0.275 - 10904.66 = 44095.34
    expect(calcIRPF(200000)).toBeCloseTo(44095.34, 2);
  });
});
