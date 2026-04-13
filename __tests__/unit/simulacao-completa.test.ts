import { describe, it, expect } from 'vitest';
import {
  calcINSS,
  calcIRPF,
  calcIRRFMensal,
  simulaPGBL,
  findAporteMinimo,
  calcDeducaoDependentesAnual,
  calcDeducaoEducacao,
  calcDescontoSimplificado,
  calcPGBLMaxAnual,
  calcAliquotaEfetiva,
  estimarAliquotaMarginal,
  adjustINSSParaServidor,
  DEPENDENTE_DEDUCAO_MENSAL,
  PGBL_LIMITE_PERCENTUAL,
  INSS_TETO_MENSAL,
  DESC_SIMPLIFICADO_TETO,
  DESC_SIMPLIFICADO_PERCENTUAL,
  DESPESA_EDUCACAO_LIMITE_POR_PESSOA,
  IRPF_ALIQUOTA_MAXIMA,
  type SimState,
} from '@/lib/calculo';
import {
  simulaInvestimentoLongoPrazo,
  calcPGBLAliqRegressiva,
  INVESTMENT_PRESETS,
  type InvestmentParams,
} from '@/lib/investimento';

// ---------------------------------------------------------------------------
// Helper: build a SimState from basic salary parameters
// ---------------------------------------------------------------------------

function buildSimState(params: {
  salarioMensal: number;
  dependentes?: number;
  despMedAnual?: number;
  despEduAnual?: number;
  pensaoMensal?: number;
  pgblMensal?: number;
  pgblEsporadico?: number;
}): SimState {
  const {
    salarioMensal,
    dependentes = 0,
    despMedAnual = 0,
    despEduAnual = 0,
    pensaoMensal = 0,
    pgblMensal = 0,
    pgblEsporadico = 0,
  } = params;

  const rendaAnual = salarioMensal * 12;
  const inssMensal = calcINSS(salarioMensal);
  const inssAnual = inssMensal * 12;
  const deducaoDependentesAnual = calcDeducaoDependentesAnual(dependentes);
  const despEduLimitada = calcDeducaoEducacao(despEduAnual, dependentes);
  const pensaoAnual = pensaoMensal * 12;
  const prevAnualAtual = pgblMensal * 12 + pgblEsporadico;
  const pgblMaxAnual = calcPGBLMaxAnual(rendaAnual);

  const totalDeducoesAnual =
    inssAnual +
    deducaoDependentesAnual +
    despMedAnual +
    despEduLimitada +
    pensaoAnual +
    prevAnualAtual;

  const baseSemPGBL = Math.max(
    0,
    rendaAnual -
      (inssAnual +
        deducaoDependentesAnual +
        despMedAnual +
        despEduLimitada +
        pensaoAnual),
  );

  const descontoSimp = calcDescontoSimplificado(rendaAnual);
  const impostoSemPGBL = calcIRPF(baseSemPGBL);
  const irrfAnual = calcIRRFMensal(salarioMensal) * 12;

  const baseSimpAnual = Math.max(0, rendaAnual - descontoSimp);
  const impostoSimplificado = calcIRPF(baseSimpAnual);
  const impostoCompleto = calcIRPF(
    Math.max(0, baseSemPGBL - prevAnualAtual),
  );

  const resultadoCompleto = impostoCompleto - irrfAnual;
  const resultadoSimplificado = impostoSimplificado - irrfAnual;
  const melhorModelo =
    impostoCompleto <= impostoSimplificado ? 'completo' : 'simplificado';

  return {
    rendaAnual,
    irrfAnual,
    inssAnual,
    deducaoDependentesAnual,
    despMedAnual,
    despEduAnual: despEduLimitada,
    pensaoAnual,
    pgblMaxAnual,
    baseSemPGBL,
    impostoSemPGBL,
    prevAnualAtual,
    impostoCompleto,
    impostoSimplificado,
    resultadoCompleto,
    resultadoSimplificado,
    melhorModelo,
    descontoSimp,
    totalDeducoesAnual,
  };
}

// ===========================================================================
// Suite 1: Simulacao completa por faixa salarial
// ===========================================================================

describe('Simulacao completa por faixa salarial', () => {
  const salaryScenarios = [
    { salary: 1000, expectedIRRFZero: true, expectedIRPFZero: true, label: 'salario minimo' },
    { salary: 3000, expectedIRRFZero: true, expectedIRPFZero: true, label: 'abaixo do redutor' },
    { salary: 5000, expectedIRRFZero: true, expectedIRPFZero: true, label: 'no limite da isencao' },
    { salary: 8000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'acima do redutor' },
    { salary: 10000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'classe media-alta' },
    { salary: 12000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'profissional senior' },
    { salary: 15000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'gerencia' },
    { salary: 20000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'diretoria' },
    { salary: 25000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'alta renda' },
    { salary: 30000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'alta renda 2' },
    { salary: 40000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'executivo' },
    { salary: 50000, expectedIRRFZero: false, expectedIRPFZero: false, label: 'C-level' },
  ];

  describe('INSS esta dentro do intervalo esperado', () => {
    it.each(salaryScenarios)(
      '$label (R$ $salary) - INSS entre 0 e teto',
      ({ salary }) => {
        const inss = calcINSS(salary);
        expect(inss).toBeGreaterThanOrEqual(0);
        expect(inss).toBeLessThanOrEqual(INSS_TETO_MENSAL);
      },
    );
  });

  describe('INSS progressivo: salario maior gera INSS maior', () => {
    it.each([
      [1000, 3000],
      [3000, 5000],
      [5000, 8000],
      [8000, 10000],
    ])('INSS(R$ %i) < INSS(R$ %i)', (low, high) => {
      expect(calcINSS(low)).toBeLessThan(calcINSS(high));
    });
  });

  describe('IRRF zerado para salarios ate R$ 5.000', () => {
    it.each(
      salaryScenarios.filter((s) => s.expectedIRRFZero),
    )('$label (R$ $salary) - IRRF = 0', ({ salary }) => {
      expect(calcIRRFMensal(salary)).toBe(0);
    });
  });

  describe('IRRF positivo para salarios acima de R$ 5.000', () => {
    it.each(
      salaryScenarios.filter((s) => !s.expectedIRRFZero),
    )('$label (R$ $salary) - IRRF > 0', ({ salary }) => {
      expect(calcIRRFMensal(salary)).toBeGreaterThan(0);
    });
  });

  describe('IRPF anual zerado quando base < R$ 60.000 (redutor)', () => {
    it.each(
      salaryScenarios.filter((s) => s.expectedIRPFZero),
    )('$label (R$ $salary) - IRPF anual = 0', ({ salary }) => {
      const st = buildSimState({ salarioMensal: salary });
      const result = simulaPGBL(st, 0);
      // Both completo and simplificado should be 0 for low salaries
      expect(result.impostoCompl).toBe(0);
      expect(result.impostoSimp).toBe(0);
    });
  });

  describe('IRPF positivo para rendas maiores', () => {
    it.each(
      salaryScenarios.filter((s) => !s.expectedIRPFZero),
    )('$label (R$ $salary) - IRPF > 0', ({ salary }) => {
      const st = buildSimState({ salarioMensal: salary });
      const result = simulaPGBL(st, 0);
      // At least one model should have positive tax
      expect(
        result.impostoCompl > 0 || result.impostoSimp > 0,
      ).toBe(true);
    });
  });

  describe('Aliquota efetiva cresce com a renda', () => {
    it('aliquota efetiva de R$ 10.000 < R$ 20.000 < R$ 50.000', () => {
      const salaries = [10000, 20000, 50000];
      const efetivas = salaries.map((s) => {
        const st = buildSimState({ salarioMensal: s });
        const result = simulaPGBL(st, 0);
        return calcAliquotaEfetiva(result.impostoFinal, st.rendaAnual);
      });

      expect(efetivas[0]).toBeLessThan(efetivas[1]);
      expect(efetivas[1]).toBeLessThan(efetivas[2]);
    });
  });

  describe('PGBL max = renda anual * 12%', () => {
    it.each(salaryScenarios)(
      '$label (R$ $salary) - PGBL max correto',
      ({ salary }) => {
        const rendaAnual = salary * 12;
        expect(calcPGBLMaxAnual(rendaAnual)).toBeCloseTo(
          rendaAnual * PGBL_LIMITE_PERCENTUAL,
          2,
        );
      },
    );
  });

  describe('Completo vs Simplificado depende do nivel de deducoes', () => {
    it('sem deducoes extras, simplificado tende a vencer para renda media', () => {
      // R$ 12.000 sem dependentes, sem despesas
      const st = buildSimState({ salarioMensal: 12000 });
      const result = simulaPGBL(st, 0);
      // Simplificado should win or tie when no extra deductions
      expect(result.impostoSimp).toBeLessThanOrEqual(result.impostoCompl);
    });

    it('com muitas deducoes, completo vence', () => {
      // R$ 20.000 com 3 dependentes + despesas medicas altas
      const st = buildSimState({
        salarioMensal: 20000,
        dependentes: 3,
        despMedAnual: 30000,
        despEduAnual: 10000,
      });
      const result = simulaPGBL(st, st.pgblMaxAnual);
      expect(result.impostoCompl).toBeLessThan(result.impostoSimp);
      expect(result.melhor).toBe('completo');
    });
  });
});

// ===========================================================================
// Suite 2: Estrategias de aporte PGBL
// ===========================================================================

describe('Estrategias de aporte PGBL', () => {
  const salario = 12000;
  const rendaAnual = salario * 12; // 144.000
  const pgblMaxAnual = rendaAnual * PGBL_LIMITE_PERCENTUAL; // 17.280

  const strategies = [
    { name: 'Sem PGBL', mensal: 0, esporadico: 0 },
    { name: 'Mensal fixo R$ 500', mensal: 500, esporadico: 0 },
    { name: 'Mensal fixo R$ 1.000', mensal: 1000, esporadico: 0 },
    { name: 'Mensal fixo no teto', mensal: 1440, esporadico: 0 },
    { name: 'Mensal + 13o', mensal: 500, esporadico: 12000 },
    { name: 'Mensal + bonus semestral', mensal: 500, esporadico: 6000 },
    { name: 'Mensal + multiplos aportes', mensal: 300, esporadico: 3600 + 2000 + 1500 },
    { name: 'So aportes esporadicos (13o + bonus)', mensal: 0, esporadico: 12000 + 5000 },
    { name: 'Teto exato (12%)', mensal: 0, esporadico: 17280 },
    { name: 'Acima do teto (deve ser limitado)', mensal: 2000, esporadico: 0 },
  ];

  const buildForStrategy = (mensal: number, esporadico: number) =>
    buildSimState({
      salarioMensal: salario,
      pgblMensal: mensal,
      pgblEsporadico: esporadico,
    });

  describe('Mais PGBL reduz impostoCompleto', () => {
    it('imposto sem PGBL >= imposto com PGBL mensal R$ 500', () => {
      const stSem = buildForStrategy(0, 0);
      const stCom = buildForStrategy(500, 0);
      const resSem = simulaPGBL(stSem, 0);
      const resCom = simulaPGBL(stCom, 500 * 12);
      expect(resCom.impostoCompl).toBeLessThanOrEqual(resSem.impostoCompl);
    });

    it('imposto com R$ 500/mes >= imposto com R$ 1.000/mes (mais PGBL, menos IR)', () => {
      const st = buildForStrategy(0, 0);
      const res500 = simulaPGBL(st, 500 * 12);
      const res1000 = simulaPGBL(st, 1000 * 12);
      expect(res1000.impostoCompl).toBeLessThanOrEqual(res500.impostoCompl);
    });
  });

  describe('ImpostoSimplificado NAO muda com PGBL', () => {
    it.each(strategies)(
      '$name - impostoSimp identico',
      ({ mensal, esporadico }) => {
        const st = buildForStrategy(mensal, esporadico);
        const aporteTotal = Math.min(
          mensal * 12 + esporadico,
          pgblMaxAnual,
        );
        const resComPGBL = simulaPGBL(st, aporteTotal);
        const resSemPGBL = simulaPGBL(st, 0);
        expect(resComPGBL.impostoSimp).toBeCloseTo(resSemPGBL.impostoSimp, 2);
      },
    );
  });

  describe('Teto tem menor impostoCompleto entre todas as estrategias', () => {
    it('estrategia teto tem menor ou igual imposto que qualquer outra', () => {
      const st = buildForStrategy(0, 0);
      const resTeto = simulaPGBL(st, pgblMaxAnual);

      for (const { mensal, esporadico } of strategies) {
        const aporteTotal = Math.min(
          mensal * 12 + esporadico,
          pgblMaxAnual,
        );
        const res = simulaPGBL(st, aporteTotal);
        expect(resTeto.impostoCompl).toBeLessThanOrEqual(
          res.impostoCompl + 0.01, // small tolerance for fp
        );
      }
    });
  });

  describe('Aporte acima do teto equivale ao teto (deducao limitada na base)', () => {
    it('mensal R$ 2.000 (24.000/ano) - base completo >= base com teto exato', () => {
      const st = buildForStrategy(0, 0);
      // The simulaPGBL function takes raw pgblAnual - it does NOT cap internally.
      // But the base = rendaAnual - deducoes - pgblAnual is capped at 0.
      // What matters is the caller should cap at pgblMaxAnual.
      const resAcima = simulaPGBL(st, 24000);
      const resTeto = simulaPGBL(st, pgblMaxAnual);
      // More PGBL just further reduces the base, but beyond a certain point
      // both converge to base = 0 or the same minimum tax.
      // At minimum, the acima case should have <= imposto vs teto
      expect(resAcima.impostoCompl).toBeLessThanOrEqual(
        resTeto.impostoCompl + 0.01,
      );
    });
  });

  describe('findAporteMinimo encontra aporte que zera resultado', () => {
    it('para salario R$ 12.000, aporte minimo zera resultado ou ja e restituicao', () => {
      const st = buildForStrategy(0, 0);
      const { aporte, resultado } = findAporteMinimo(st);
      // Either result is already <= 0 (restitution) or the aporte zeroed it
      expect(resultado.resultFinal).toBeLessThanOrEqual(0.01);
      expect(aporte).toBeGreaterThanOrEqual(0);
      expect(aporte).toBeLessThanOrEqual(pgblMaxAnual + 12); // +12 due to rounding
    });

    it('aporte minimo e multiplo de 12', () => {
      const st = buildForStrategy(0, 0);
      const { aporte } = findAporteMinimo(st);
      expect(aporte % 12).toBe(0);
    });
  });
});

// ===========================================================================
// Suite 3: Comparativo PGBL vs investimentos alternativos
// ===========================================================================

describe('Comparativo PGBL vs investimentos alternativos', () => {
  const salario = 12000;
  const rendaAnual = salario * 12;
  const aporteAnualPGBL = rendaAnual * PGBL_LIMITE_PERCENTUAL; // 17.280
  const horizonteAnos = 15;

  const st = buildSimState({ salarioMensal: salario });
  const { aporte: aporteMinimo } = findAporteMinimo(st);
  const aliqEfetiva = calcAliquotaEfetiva(
    simulaPGBL(st, 0).impostoFinal,
    rendaAnual,
  );
  const aliqMarginal = estimarAliquotaMarginal(aliqEfetiva / 100);

  const investmentScenarios = [
    { tipo: 'selic', rendPGBL: 12, rendAlt: 14.75, irAlt: 0.15, isento: false },
    { tipo: 'selic-media', rendPGBL: 12, rendAlt: 9.57, irAlt: 0.15, isento: false },
    { tipo: 'cdb-100', rendPGBL: 12, rendAlt: 14.65, irAlt: 0.15, isento: false },
    { tipo: 'cdb-110', rendPGBL: 12, rendAlt: 16.12, irAlt: 0.15, isento: false },
    { tipo: 'lci-lca', rendPGBL: 12, rendAlt: 13.33, irAlt: 0, isento: true },
    { tipo: 'fii', rendPGBL: 12, rendAlt: 8.00, irAlt: 0, isento: true },
    { tipo: 'ibovespa', rendPGBL: 12, rendAlt: 12.00, irAlt: 0.15, isento: false },
  ];

  describe('Aliquota regressiva PGBL no ano 15 = 10%', () => {
    it.each(investmentScenarios)(
      '$tipo - aliquota regressiva ano 15 = 10%',
      ({ rendPGBL, rendAlt, irAlt }) => {
        const params: InvestmentParams = {
          aporteAnualPGBL,
          aporteMinimoPGBL: aporteMinimo,
          saldoAtualPGBL: 0,
          rendimentoPGBL: rendPGBL,
          rendimentoAlternativo: rendAlt,
          irSobreLucroAlt: irAlt,
          tabelaPGBL: 'regressiva',
          horizonteAnos,
          aliquotaMarginalIR: aliqMarginal,
        };
        const projections = simulaInvestimentoLongoPrazo(params);
        const year15 = projections[14];
        expect(year15.pgblAliqResgate).toBe(0.10);
      },
    );
  });

  describe('pgblTotalReal = pgblLiquido + pgblBeneficioIRAcum', () => {
    it.each(investmentScenarios)(
      '$tipo - pgblTotalReal composto corretamente',
      ({ rendPGBL, rendAlt, irAlt }) => {
        const params: InvestmentParams = {
          aporteAnualPGBL,
          aporteMinimoPGBL: aporteMinimo,
          saldoAtualPGBL: 0,
          rendimentoPGBL: rendPGBL,
          rendimentoAlternativo: rendAlt,
          irSobreLucroAlt: irAlt,
          tabelaPGBL: 'regressiva',
          horizonteAnos,
          aliquotaMarginalIR: aliqMarginal,
        };
        const projections = simulaInvestimentoLongoPrazo(params);
        for (const p of projections) {
          expect(p.pgblTotalReal).toBeCloseTo(
            p.pgblLiquido + p.pgblBeneficioIRAcum,
            0,
          );
        }
      },
    );
  });

  describe('mixTotalReal = mixTotalLiquido + mixBeneficioIRAcum', () => {
    it.each(investmentScenarios)(
      '$tipo - mixTotalReal composto corretamente',
      ({ rendPGBL, rendAlt, irAlt }) => {
        const params: InvestmentParams = {
          aporteAnualPGBL,
          aporteMinimoPGBL: aporteMinimo,
          saldoAtualPGBL: 0,
          rendimentoPGBL: rendPGBL,
          rendimentoAlternativo: rendAlt,
          irSobreLucroAlt: irAlt,
          tabelaPGBL: 'regressiva',
          horizonteAnos,
          aliquotaMarginalIR: aliqMarginal,
        };
        const projections = simulaInvestimentoLongoPrazo(params);
        for (const p of projections) {
          expect(p.mixTotalReal).toBeCloseTo(
            p.mixTotalLiquido + p.mixBeneficioIRAcum,
            0,
          );
        }
      },
    );
  });

  describe('Investimentos isentos: mixAltIR = 0 em todos os anos', () => {
    it.each(
      investmentScenarios.filter((s) => s.isento),
    )('$tipo (isento) - mixAltIR = 0 todos os anos', ({ rendPGBL, rendAlt, irAlt }) => {
      const params: InvestmentParams = {
        aporteAnualPGBL,
        aporteMinimoPGBL: aporteMinimo,
        saldoAtualPGBL: 0,
        rendimentoPGBL: rendPGBL,
        rendimentoAlternativo: rendAlt,
        irSobreLucroAlt: irAlt,
        tabelaPGBL: 'regressiva',
        horizonteAnos,
        aliquotaMarginalIR: aliqMarginal,
      };
      const projections = simulaInvestimentoLongoPrazo(params);
      for (const p of projections) {
        expect(p.mixAltIR).toBe(0);
      }
    });
  });

  describe('Investimentos tributados: mixAltIR > 0 a partir do ano 1', () => {
    it.each(
      investmentScenarios.filter((s) => !s.isento),
    )('$tipo (tributado) - mixAltIR > 0', ({ rendPGBL, rendAlt, irAlt }) => {
      const params: InvestmentParams = {
        aporteAnualPGBL,
        aporteMinimoPGBL: aporteMinimo,
        saldoAtualPGBL: 0,
        rendimentoPGBL: rendPGBL,
        rendimentoAlternativo: rendAlt,
        irSobreLucroAlt: irAlt,
        tabelaPGBL: 'regressiva',
        horizonteAnos,
        aliquotaMarginalIR: aliqMarginal,
      };
      const projections = simulaInvestimentoLongoPrazo(params);
      // From year 1 onwards there are gains, so IR should be > 0
      // (assuming aporteMinimoPGBL < aporteAnualPGBL so there's an alt investment)
      if (aporteMinimo < aporteAnualPGBL) {
        for (const p of projections) {
          expect(p.mixAltIR).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Saldos sao positivos e crescentes', () => {
    it('pgblSaldo cresce ano a ano (retorno positivo)', () => {
      const params: InvestmentParams = {
        aporteAnualPGBL,
        aporteMinimoPGBL: aporteMinimo,
        saldoAtualPGBL: 0,
        rendimentoPGBL: 12,
        rendimentoAlternativo: 14.75,
        irSobreLucroAlt: 0.15,
        tabelaPGBL: 'regressiva',
        horizonteAnos,
        aliquotaMarginalIR: aliqMarginal,
      };
      const projections = simulaInvestimentoLongoPrazo(params);
      for (let i = 1; i < projections.length; i++) {
        expect(projections[i].pgblSaldo).toBeGreaterThan(
          projections[i - 1].pgblSaldo,
        );
      }
    });

    it('todos os valores monetarios sao positivos', () => {
      const params: InvestmentParams = {
        aporteAnualPGBL,
        aporteMinimoPGBL: aporteMinimo,
        saldoAtualPGBL: 0,
        rendimentoPGBL: 12,
        rendimentoAlternativo: 14.75,
        irSobreLucroAlt: 0.15,
        tabelaPGBL: 'regressiva',
        horizonteAnos,
        aliquotaMarginalIR: aliqMarginal,
      };
      const projections = simulaInvestimentoLongoPrazo(params);
      for (const p of projections) {
        expect(p.pgblSaldo).toBeGreaterThan(0);
        expect(p.pgblLiquido).toBeGreaterThan(0);
        expect(p.pgblTotalReal).toBeGreaterThan(0);
        expect(p.mixTotalBruto).toBeGreaterThan(0);
        expect(p.mixTotalLiquido).toBeGreaterThan(0);
      }
    });
  });
});

// ===========================================================================
// Suite 4: Sensibilidade a taxas de juros
// ===========================================================================

describe('Sensibilidade a taxas de juros', () => {
  const salario = 12000;
  const rendaAnual = salario * 12;
  const aporteAnualPGBL = rendaAnual * PGBL_LIMITE_PERCENTUAL;
  const st = buildSimState({ salarioMensal: salario });
  const { aporte: aporteMinimo } = findAporteMinimo(st);
  const aliqEfetiva = calcAliquotaEfetiva(
    simulaPGBL(st, 0).impostoFinal,
    rendaAnual,
  );
  const aliqMarginal = estimarAliquotaMarginal(aliqEfetiva / 100);

  const rateScenarios = [
    { rendPGBL: 8, rendAlt: 10, label: 'Selic baixa' },
    { rendPGBL: 10, rendAlt: 12, label: 'Selic moderada' },
    { rendPGBL: 12, rendAlt: 14.75, label: 'Selic atual (2026)' },
    { rendPGBL: 14, rendAlt: 16, label: 'Selic alta' },
    { rendPGBL: 12, rendAlt: 12, label: 'Mesma taxa' },
    { rendPGBL: 15, rendAlt: 12, label: 'PGBL rende mais' },
    { rendPGBL: 8, rendAlt: 15, label: 'Alt rende muito mais' },
  ];

  const buildParams = (
    rendPGBL: number,
    rendAlt: number,
    horizonte: number,
  ): InvestmentParams => ({
    aporteAnualPGBL,
    aporteMinimoPGBL: aporteMinimo,
    saldoAtualPGBL: 0,
    rendimentoPGBL: rendPGBL,
    rendimentoAlternativo: rendAlt,
    irSobreLucroAlt: 0.15,
    tabelaPGBL: 'regressiva',
    horizonteAnos: horizonte,
    aliquotaMarginalIR: aliqMarginal,
  });

  describe('Mesma taxa: PGBL tende a vencer em 10+ anos (beneficio IR)', () => {
    it('com mesma taxa (12%), PGBL totalReal > mix totalReal no ano 10', () => {
      const projections = simulaInvestimentoLongoPrazo(
        buildParams(12, 12, 20),
      );
      const year10 = projections[9];
      // PGBL should win when returns are the same due to IR benefit
      expect(year10.pgblTotalReal).toBeGreaterThan(year10.mixTotalReal);
    });

    it('com mesma taxa (12%), PGBL vence tambem no ano 20', () => {
      const projections = simulaInvestimentoLongoPrazo(
        buildParams(12, 12, 20),
      );
      const year20 = projections[19];
      expect(year20.pgblTotalReal).toBeGreaterThan(year20.mixTotalReal);
    });
  });

  describe('Todos os valores monetarios sao positivos', () => {
    it.each(rateScenarios)(
      '$label (PGBL $rendPGBL%, Alt $rendAlt%) - 10 anos todos positivos',
      ({ rendPGBL, rendAlt }) => {
        const projections = simulaInvestimentoLongoPrazo(
          buildParams(rendPGBL, rendAlt, 10),
        );
        for (const p of projections) {
          expect(p.pgblSaldo).toBeGreaterThan(0);
          expect(p.pgblLiquido).toBeGreaterThan(0);
          expect(p.mixTotalBruto).toBeGreaterThan(0);
        }
      },
    );

    it.each(rateScenarios)(
      '$label (PGBL $rendPGBL%, Alt $rendAlt%) - 20 anos todos positivos',
      ({ rendPGBL, rendAlt }) => {
        const projections = simulaInvestimentoLongoPrazo(
          buildParams(rendPGBL, rendAlt, 20),
        );
        for (const p of projections) {
          expect(p.pgblSaldo).toBeGreaterThan(0);
          expect(p.pgblLiquido).toBeGreaterThan(0);
          expect(p.mixTotalBruto).toBeGreaterThan(0);
        }
      },
    );
  });

  describe('Saldos crescem ano a ano (retornos positivos)', () => {
    it.each(rateScenarios)(
      '$label - pgblSaldo crescente em 10 anos',
      ({ rendPGBL, rendAlt }) => {
        const projections = simulaInvestimentoLongoPrazo(
          buildParams(rendPGBL, rendAlt, 10),
        );
        for (let i = 1; i < projections.length; i++) {
          expect(projections[i].pgblSaldo).toBeGreaterThan(
            projections[i - 1].pgblSaldo,
          );
        }
      },
    );

    it.each(rateScenarios)(
      '$label - mixTotalBruto crescente em 20 anos',
      ({ rendPGBL, rendAlt }) => {
        const projections = simulaInvestimentoLongoPrazo(
          buildParams(rendPGBL, rendAlt, 20),
        );
        for (let i = 1; i < projections.length; i++) {
          expect(projections[i].mixTotalBruto).toBeGreaterThan(
            projections[i - 1].mixTotalBruto,
          );
        }
      },
    );
  });

  describe('PGBL rende mais que alternativa: PGBL vence de forma clara', () => {
    it('PGBL 15% vs Alt 12% - PGBL totalReal > mix em todos os anos', () => {
      const projections = simulaInvestimentoLongoPrazo(
        buildParams(15, 12, 20),
      );
      // After a couple years (IR benefit kicks in), PGBL should dominate
      for (let i = 2; i < projections.length; i++) {
        expect(projections[i].pgblTotalReal).toBeGreaterThan(
          projections[i].mixTotalReal,
        );
      }
    });
  });

  describe('Alternativa rende muito mais: mix pode vencer', () => {
    it('PGBL 8% vs Alt 15% - diferenca grande pode fazer mix vencer no longo prazo', () => {
      const projections = simulaInvestimentoLongoPrazo(
        buildParams(8, 15, 20),
      );
      const year20 = projections[19];
      // With such a large rate difference favoring alt, mix can potentially beat PGBL
      // At minimum, the mix alternative portion should have substantial gains
      expect(year20.mixAltSaldo).toBeGreaterThan(year20.mixAltAportesAcum);
    });
  });

  describe('Tabela regressiva: aliquota diminui com o tempo', () => {
    it('aliquota ano 1 > ano 5 > ano 10 > ano 15', () => {
      const projections = simulaInvestimentoLongoPrazo(
        buildParams(12, 14.75, 20),
      );
      expect(projections[0].pgblAliqResgate).toBeGreaterThan(
        projections[4].pgblAliqResgate,
      );
      expect(projections[4].pgblAliqResgate).toBeGreaterThan(
        projections[9].pgblAliqResgate,
      );
      expect(projections[9].pgblAliqResgate).toBeGreaterThanOrEqual(
        projections[14].pgblAliqResgate,
      );
    });
  });
});

// ===========================================================================
// Suite 5: Funcoes auxiliares extraidas
// ===========================================================================

describe('Funcoes auxiliares extraidas', () => {
  // ---- calcDeducaoDependentesAnual ----
  describe('calcDeducaoDependentesAnual', () => {
    it('0 dependentes retorna 0', () => {
      expect(calcDeducaoDependentesAnual(0)).toBe(0);
    });

    it('1 dependente retorna 189.59 * 12 = 2275.08', () => {
      expect(calcDeducaoDependentesAnual(1)).toBeCloseTo(
        DEPENDENTE_DEDUCAO_MENSAL * 12,
        2,
      );
      expect(calcDeducaoDependentesAnual(1)).toBeCloseTo(2275.08, 2);
    });

    it('3 dependentes retorna 189.59 * 3 * 12 = 6825.24', () => {
      expect(calcDeducaoDependentesAnual(3)).toBeCloseTo(
        DEPENDENTE_DEDUCAO_MENSAL * 3 * 12,
        2,
      );
      expect(calcDeducaoDependentesAnual(3)).toBeCloseTo(6825.24, 2);
    });

    it('5 dependentes e proporcional', () => {
      expect(calcDeducaoDependentesAnual(5)).toBeCloseTo(
        DEPENDENTE_DEDUCAO_MENSAL * 5 * 12,
        2,
      );
    });
  });

  // ---- calcDeducaoEducacao ----
  describe('calcDeducaoEducacao', () => {
    it('valor dentro do limite retorna valor integral', () => {
      expect(calcDeducaoEducacao(2000, 0)).toBe(2000);
    });

    it('excede limite para 1 pessoa (titular) - capa em 3561.50', () => {
      expect(calcDeducaoEducacao(5000, 0)).toBeCloseTo(
        DESPESA_EDUCACAO_LIMITE_POR_PESSOA,
        2,
      );
    });

    it('com 2 dependentes o limite e 3561.50 * 3 (titular + 2)', () => {
      const limite = DESPESA_EDUCACAO_LIMITE_POR_PESSOA * 3;
      expect(calcDeducaoEducacao(limite, 2)).toBeCloseTo(limite, 2);
      expect(calcDeducaoEducacao(limite + 1000, 2)).toBeCloseTo(limite, 2);
    });

    it('0 informado retorna 0 independente de dependentes', () => {
      expect(calcDeducaoEducacao(0, 3)).toBe(0);
    });

    it('com 1 dependente, limite = 3561.50 * 2 = 7123.00', () => {
      const limite = DESPESA_EDUCACAO_LIMITE_POR_PESSOA * 2;
      expect(calcDeducaoEducacao(7000, 1)).toBeCloseTo(7000, 2);
      expect(calcDeducaoEducacao(8000, 1)).toBeCloseTo(limite, 2);
    });
  });

  // ---- calcDescontoSimplificado ----
  describe('calcDescontoSimplificado', () => {
    it('20% abaixo do teto retorna 20%', () => {
      const renda = 50000;
      expect(calcDescontoSimplificado(renda)).toBeCloseTo(
        renda * DESC_SIMPLIFICADO_PERCENTUAL,
        2,
      );
    });

    it('20% acima do teto retorna teto (17640)', () => {
      const renda = 200000;
      expect(calcDescontoSimplificado(renda)).toBeCloseTo(
        DESC_SIMPLIFICADO_TETO,
        2,
      );
    });

    it('boundary: renda onde 20% = teto exatamente (88200)', () => {
      const rendaBoundary = DESC_SIMPLIFICADO_TETO / DESC_SIMPLIFICADO_PERCENTUAL;
      expect(rendaBoundary).toBeCloseTo(88200, 0);
      expect(calcDescontoSimplificado(rendaBoundary)).toBeCloseTo(
        DESC_SIMPLIFICADO_TETO,
        2,
      );
    });

    it('renda 0 retorna 0', () => {
      expect(calcDescontoSimplificado(0)).toBe(0);
    });

    it('renda 10000 retorna 2000', () => {
      expect(calcDescontoSimplificado(10000)).toBeCloseTo(2000, 2);
    });
  });

  // ---- calcPGBLMaxAnual ----
  describe('calcPGBLMaxAnual', () => {
    it('12% de 144000 = 17280', () => {
      expect(calcPGBLMaxAnual(144000)).toBeCloseTo(17280, 2);
    });

    it('12% de 60000 = 7200', () => {
      expect(calcPGBLMaxAnual(60000)).toBeCloseTo(7200, 2);
    });

    it('12% de 0 = 0', () => {
      expect(calcPGBLMaxAnual(0)).toBe(0);
    });

    it('12% de 1000000 = 120000', () => {
      expect(calcPGBLMaxAnual(1000000)).toBeCloseTo(120000, 2);
    });
  });

  // ---- calcAliquotaEfetiva ----
  describe('calcAliquotaEfetiva', () => {
    it('imposto 0 retorna 0%', () => {
      expect(calcAliquotaEfetiva(0, 100000)).toBe(0);
    });

    it('renda 0 retorna 0%', () => {
      expect(calcAliquotaEfetiva(5000, 0)).toBe(0);
    });

    it('23844 / 144000 retorna aproximadamente 16.56%', () => {
      expect(calcAliquotaEfetiva(23844, 144000)).toBeCloseTo(16.56, 1);
    });

    it('10000 / 100000 retorna 10%', () => {
      expect(calcAliquotaEfetiva(10000, 100000)).toBeCloseTo(10, 2);
    });

    it('ambos zero retorna 0%', () => {
      expect(calcAliquotaEfetiva(0, 0)).toBe(0);
    });
  });

  // ---- estimarAliquotaMarginal ----
  describe('estimarAliquotaMarginal', () => {
    it('efetiva 0 retorna fallback 15%', () => {
      expect(estimarAliquotaMarginal(0)).toBe(0.15);
    });

    it('efetiva 0.10 retorna 0.15 (10% * 1.5)', () => {
      expect(estimarAliquotaMarginal(0.10)).toBeCloseTo(0.15, 4);
    });

    it('efetiva 0.20 retorna 0.275 (capped at max)', () => {
      // 0.20 * 1.5 = 0.30, mas capped at 0.275
      expect(estimarAliquotaMarginal(0.20)).toBeCloseTo(
        IRPF_ALIQUOTA_MAXIMA,
        4,
      );
    });

    it('efetiva negativa retorna fallback 15%', () => {
      expect(estimarAliquotaMarginal(-0.05)).toBe(0.15);
    });

    it('efetiva 0.05 retorna 0.075 (5% * 1.5)', () => {
      expect(estimarAliquotaMarginal(0.05)).toBeCloseTo(0.075, 4);
    });

    it('efetiva 0.15 retorna 0.225 (15% * 1.5)', () => {
      expect(estimarAliquotaMarginal(0.15)).toBeCloseTo(0.225, 4);
    });

    it('efetiva 0.275 retorna 0.275 (cap)', () => {
      // 0.275 * 1.5 = 0.4125, capped at 0.275
      expect(estimarAliquotaMarginal(0.275)).toBeCloseTo(
        IRPF_ALIQUOTA_MAXIMA,
        4,
      );
    });
  });

  // ---- adjustINSSParaServidor ----
  describe('adjustINSSParaServidor', () => {
    it('resultado nao excede INSS_TETO_MENSAL', () => {
      // Test with a large INSS value
      const adjusted = adjustINSSParaServidor(INSS_TETO_MENSAL);
      expect(adjusted).toBeLessThanOrEqual(INSS_TETO_MENSAL);
    });

    it('CLT INSS tipico e ajustado para RPPS', () => {
      const inssCLT = calcINSS(5000); // typical salary
      const adjusted = adjustINSSParaServidor(inssCLT);
      expect(adjusted).toBeGreaterThan(0);
      expect(adjusted).toBeLessThanOrEqual(INSS_TETO_MENSAL);
    });

    it('INSS 0 retorna 0', () => {
      expect(adjustINSSParaServidor(0)).toBe(0);
    });

    it('calculo correto: inss * 1.14 / 0.14 * 0.11', () => {
      const inssBase = 500;
      const expected = Math.min(
        inssBase * 1.14 / 0.14 * 0.11,
        INSS_TETO_MENSAL,
      );
      expect(adjustINSSParaServidor(inssBase)).toBeCloseTo(expected, 2);
    });

    it('valor alto de INSS e capado no teto', () => {
      const adjusted = adjustINSSParaServidor(900);
      expect(adjusted).toBeLessThanOrEqual(INSS_TETO_MENSAL);
    });
  });

  // ---- calcPGBLAliqRegressiva ----
  describe('calcPGBLAliqRegressiva', () => {
    it('ano 1 retorna 35%', () => {
      expect(calcPGBLAliqRegressiva(1)).toBe(0.35);
    });

    it('ano 2 retorna 35%', () => {
      expect(calcPGBLAliqRegressiva(2)).toBe(0.35);
    });

    it('ano 3 retorna 30%', () => {
      expect(calcPGBLAliqRegressiva(3)).toBe(0.30);
    });

    it('ano 4 retorna 30%', () => {
      expect(calcPGBLAliqRegressiva(4)).toBe(0.30);
    });

    it('ano 5 retorna 25%', () => {
      expect(calcPGBLAliqRegressiva(5)).toBe(0.25);
    });

    it('ano 6 retorna 25%', () => {
      expect(calcPGBLAliqRegressiva(6)).toBe(0.25);
    });

    it('ano 7 retorna 20%', () => {
      expect(calcPGBLAliqRegressiva(7)).toBe(0.20);
    });

    it('ano 9 retorna 15%', () => {
      expect(calcPGBLAliqRegressiva(9)).toBe(0.15);
    });

    it('ano 10 retorna 15%', () => {
      expect(calcPGBLAliqRegressiva(10)).toBe(0.15);
    });

    it('ano 11+ retorna 10%', () => {
      expect(calcPGBLAliqRegressiva(11)).toBe(0.10);
      expect(calcPGBLAliqRegressiva(20)).toBe(0.10);
      expect(calcPGBLAliqRegressiva(50)).toBe(0.10);
    });
  });
});
