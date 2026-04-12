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
