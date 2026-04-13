// ---------------------------------------------------------------------------
// investimento.ts - Pure TypeScript functions for long-term investment
// comparison: PGBL at ceiling vs minimum PGBL + alternative investments.
// ---------------------------------------------------------------------------

// ---- Types ----------------------------------------------------------------

export interface InvestmentPreset {
  nome: string;
  taxa: number;      // annual return %
  irAliq: number;    // IR rate on gains (0 if tax-free)
  isento: boolean;   // whether tax-free
}

export interface InvestmentParams {
  aporteAnualPGBL: number;
  aporteMinimoPGBL: number;   // minimum PGBL to avoid paying IR
  saldoAtualPGBL: number;
  rendimentoPGBL: number;     // annual % (e.g. 12)
  rendimentoAlternativo: number; // annual % (e.g. 14.75)
  irSobreLucroAlt: number;   // e.g. 0.15 for 15%
  tabelaPGBL: 'regressiva' | 'progressiva';
  horizonteAnos: number;
  /**
   * Alíquota marginal aproximada do IRPF do contribuinte.
   * Usada para calcular o benefício fiscal do PGBL: cada R$ 1 aportado
   * "economiza" R$ aliquotaMarginalIR de imposto.
   *
   * Calculada como: alíquota efetiva × 1.5 (estimativa da faixa marginal),
   * limitada a 27,5%. Fallback: 15% se alíquota efetiva for zero.
   *
   * Fonte: Tabela Progressiva IRPF 2026 — Lei nº 15.191/2025
   * Faixas: 0% | 7,5% | 15% | 22,5% | 27,5%
   */
  aliquotaMarginalIR: number;
}

export interface YearProjection {
  ano: number;
  // Scenario A: PGBL at ceiling
  pgblAportesAcum: number;
  pgblSaldo: number;
  pgblAliqResgate: number;    // regressive table rate for this year
  pgblIRResgate: number;
  pgblLiquido: number;
  pgblBeneficioIRAcum: number; // cumulative IR savings reinvested
  pgblTotalReal: number;       // pgblLiquido + pgblBeneficioIRAcum (compounded)
  // Scenario B: Min PGBL + alternative
  mixPgblSaldo: number;
  mixAltSaldo: number;
  mixAltAportesAcum: number;
  mixTotalBruto: number;
  mixPgblIR: number;
  mixAltIR: number;
  mixTotalLiquido: number;
  mixBeneficioIRAcum: number;
  mixTotalReal: number;        // mixTotalLiquido + mixBeneficioIRAcum
}

// ---- Constants ------------------------------------------------------------

export const PGBL_TABELA_REGRESSIVA: ReadonlyArray<{ ateAnos: number; aliq: number }> = [
  { ateAnos: 2, aliq: 0.35 },
  { ateAnos: 4, aliq: 0.30 },
  { ateAnos: 6, aliq: 0.25 },
  { ateAnos: 8, aliq: 0.20 },
  { ateAnos: 10, aliq: 0.15 },
  { ateAnos: Infinity, aliq: 0.10 },
];

export const IRPF_PROGRESSIVA_ANUAL: ReadonlyArray<{
  ate: number;
  aliq: number;
  deducao: number;
}> = [
  { ate: 29145.60, aliq: 0, deducao: 0 },
  { ate: 33919.80, aliq: 0.075, deducao: 2185.92 },
  { ate: 45012.60, aliq: 0.15, deducao: 4729.91 },
  { ate: 55976.16, aliq: 0.225, deducao: 8105.85 },
  { ate: Infinity, aliq: 0.275, deducao: 10904.66 },
];

export const RENDA_FIXA_IR: ReadonlyArray<{ ateDias: number; aliq: number }> = [
  { ateDias: 180, aliq: 0.225 },
  { ateDias: 360, aliq: 0.20 },
  { ateDias: 720, aliq: 0.175 },
  { ateDias: Infinity, aliq: 0.15 },
];

/**
 * Presets de investimentos alternativos com taxas baseadas em dados públicos.
 *
 * Fontes:
 * - Selic atual: 14,75% a.a. (COPOM 18/03/2026) — bcb.gov.br
 * - Selic média 10 anos: 9,57% a.a. (2016-2025, média das metas anuais) — BCB/COPOM
 * - CDI: ~0,10pp abaixo da Selic — cetip.com.br
 * - LCI/LCA: 90-93% do CDI (média de mercado) — Investidor10, InfoMoney
 * - IFIX DY: ~8% médio 10 anos — Economatica (insight.economatica.com)
 * - IBOVESPA: ~12% nominal médio 10 anos, ~6,9% real 50 anos — B3, Economatica
 * - CDB 110%: bancos digitais/menores, maior risco — Investidor10
 *
 * @see https://www.bcb.gov.br/controleinflacao/taxaselic
 * @see https://investidor10.com.br/indices/cdi/
 * @see https://insight.economatica.com/dividend-yield-medio-dos-indices/
 * @see https://insight.economatica.com/desempenho-do-ibovespa-50-anos-de-historia/
 */
export const INVESTMENT_PRESETS: Record<string, InvestmentPreset> = {
  // Selic atual (COPOM 18/03/2026)
  'selic': { nome: 'Tesouro Selic (atual)', taxa: 14.75, irAliq: 0.15, isento: false },
  // Selic média dos últimos 10 anos (2016-2025): média das metas anuais do COPOM
  'selic-media': { nome: 'Selic Média (10 anos)', taxa: 9.57, irAliq: 0.15, isento: false },
  // CDI acompanha a Selic com ~0,10pp de diferença
  'cdb-100': { nome: 'CDB 100% CDI', taxa: 14.65, irAliq: 0.15, isento: false },
  // CDB 110%: bancos digitais/menores oferecem prêmio sobre o CDI (maior risco de crédito)
  'cdb-110': { nome: 'CDB 110% CDI', taxa: 16.12, irAliq: 0.15, isento: false },
  // LCI/LCA: média de mercado 91% do CDI, isentas de IR para PF
  'lci-lca': { nome: 'LCI/LCA 91% CDI', taxa: 13.33, irAliq: 0, isento: true },
  // FIIs: dividend yield médio do IFIX nos últimos 10 anos (~8%), dividendos isentos para PF
  'fii': { nome: 'FIIs (IFIX DY médio)', taxa: 8.00, irAliq: 0, isento: true },
  // IBOVESPA: retorno nominal médio ~12% a.a. (últimos 10 anos), IR de 15% sobre ganho líquido
  'ibovespa': { nome: 'Ações (IBOV 10 anos)', taxa: 12.00, irAliq: 0.15, isento: false },
  // Personalizado: permite ao usuário definir taxa e IR manualmente
  'personalizado': { nome: 'Personalizado', taxa: 12.00, irAliq: 0.15, isento: false },
};

// ---- Helper Functions -----------------------------------------------------

/**
 * Returns the regressive-table IR rate for PGBL based on holding period.
 */
export function calcPGBLAliqRegressiva(anos: number): number {
  for (const faixa of PGBL_TABELA_REGRESSIVA) {
    if (anos <= faixa.ateAnos) {
      return faixa.aliq;
    }
  }
  // Fallback (should never reach due to Infinity sentinel)
  return 0.10;
}

/**
 * Applies the progressive IRPF table to a PGBL withdrawal amount.
 * Returns the effective tax rate (imposto / valorResgate).
 */
export function calcPGBLAliqProgressiva(valorResgate: number): number {
  if (valorResgate <= 0) return 0;

  for (const faixa of IRPF_PROGRESSIVA_ANUAL) {
    if (valorResgate <= faixa.ate) {
      const imposto = valorResgate * faixa.aliq - faixa.deducao;
      return Math.max(imposto, 0) / valorResgate;
    }
  }

  // Above last bracket (should not reach due to Infinity)
  const ultima = IRPF_PROGRESSIVA_ANUAL[IRPF_PROGRESSIVA_ANUAL.length - 1];
  const imposto = valorResgate * ultima.aliq - ultima.deducao;
  return Math.max(imposto, 0) / valorResgate;
}

// ---- Main Simulation ------------------------------------------------------

/**
 * Simulates year-by-year projections comparing two scenarios:
 *   A) Contribute the full aporteAnualPGBL to PGBL
 *   B) Contribute only the minimum PGBL and invest the rest in an alternative
 *
 * Returns one YearProjection per year, from year 1 to horizonteAnos.
 */
export function simulaInvestimentoLongoPrazo(
  params: InvestmentParams,
): YearProjection[] {
  const {
    aporteAnualPGBL,
    aporteMinimoPGBL,
    saldoAtualPGBL,
    rendimentoPGBL,
    rendimentoAlternativo,
    irSobreLucroAlt,
    tabelaPGBL,
    horizonteAnos,
    aliquotaMarginalIR,
  } = params;

  const rPGBL = 1 + rendimentoPGBL / 100;
  const rAlt = 1 + rendimentoAlternativo / 100;
  const aporteAlt = aporteAnualPGBL - aporteMinimoPGBL;
  const isento = irSobreLucroAlt === 0;

  const projections: YearProjection[] = [];

  // Running state -- Scenario A
  let pgblSaldo = saldoAtualPGBL;
  let pgblAportesAcum = 0;
  let pgblBeneficioIRAcum = 0;

  // Running state -- Scenario B
  let mixPgblSaldo = saldoAtualPGBL;
  let mixAltSaldo = 0;
  let mixAltAportesAcum = 0;
  let mixBeneficioIRAcum = 0;

  for (let y = 1; y <= horizonteAnos; y++) {
    // ------ Scenario A: Full PGBL ------
    pgblAportesAcum += aporteAnualPGBL;
    pgblSaldo = (pgblSaldo + aporteAnualPGBL) * rPGBL;

    const beneficioAnual = aporteAnualPGBL * aliquotaMarginalIR;
    pgblBeneficioIRAcum = (pgblBeneficioIRAcum + beneficioAnual) * rAlt;

    const aliqResgate =
      tabelaPGBL === 'regressiva'
        ? calcPGBLAliqRegressiva(y)
        : calcPGBLAliqProgressiva(pgblSaldo);

    const pgblIRResgate = pgblSaldo * aliqResgate;
    const pgblLiquido = pgblSaldo - pgblIRResgate;
    const pgblTotalReal = pgblLiquido + pgblBeneficioIRAcum;

    // ------ Scenario B: Min PGBL + Alternative ------
    mixPgblSaldo = (mixPgblSaldo + aporteMinimoPGBL) * rPGBL;
    mixAltAportesAcum += aporteAlt;
    mixAltSaldo = (mixAltSaldo + aporteAlt) * rAlt;

    const beneficioMin = aporteMinimoPGBL * aliquotaMarginalIR;
    mixBeneficioIRAcum = (mixBeneficioIRAcum + beneficioMin) * rAlt;

    const mixPgblIR = mixPgblSaldo * aliqResgate;
    const mixAltGanhos = mixAltSaldo - mixAltAportesAcum;
    const mixAltIR = isento ? 0 : mixAltGanhos * irSobreLucroAlt;
    const mixTotalBruto = mixPgblSaldo + mixAltSaldo;
    const mixTotalLiquido =
      (mixPgblSaldo - mixPgblIR) + (mixAltSaldo - mixAltIR);
    const mixTotalReal = mixTotalLiquido + mixBeneficioIRAcum;

    projections.push({
      ano: y,
      // Scenario A
      pgblAportesAcum,
      pgblSaldo,
      pgblAliqResgate: aliqResgate,
      pgblIRResgate,
      pgblLiquido,
      pgblBeneficioIRAcum,
      pgblTotalReal,
      // Scenario B
      mixPgblSaldo,
      mixAltSaldo,
      mixAltAportesAcum,
      mixTotalBruto,
      mixPgblIR,
      mixAltIR,
      mixTotalLiquido,
      mixBeneficioIRAcum,
      mixTotalReal,
    });
  }

  return projections;
}

// ---- Formatting -----------------------------------------------------------

/**
 * Formats a number as BRL currency: "R$ 1.234,56".
 * Self-contained -- no import dependency on calculo.ts.
 */
export function formatBRL(v: number): string {
  const abs = Math.abs(v);
  const formatted = abs
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return v < 0 ? `R$ -${formatted}` : `R$ ${formatted}`;
}
