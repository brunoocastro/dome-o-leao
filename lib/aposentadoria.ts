// ---------------------------------------------------------------------------
// aposentadoria.ts - Pure TypeScript functions for PGBL retirement simulation.
// Two modes: (1) given contributions → projected withdrawal,
//            (2) given target income → required contributions.
// ---------------------------------------------------------------------------

import {
  calcPGBLAliqRegressiva,
  calcPGBLAliqProgressiva,
} from '@/lib/investimento';

// ---- Constants -------------------------------------------------------------

/**
 * Expectativa de vida média do brasileiro (IBGE 2024).
 * Usado como default para calcular o período de retirada na aposentadoria.
 * @see https://www.ibge.gov.br/estatisticas/sociais/populacao/9126-tabuas-completas-de-mortalidade.html
 */
export const EXPECTATIVA_VIDA_BRASIL = 77;

/**
 * Meta de inflação do Banco Central (centro da banda IPCA).
 * Usado para calcular o poder de compra real das retiradas.
 * @see https://www.bcb.gov.br/controleinflacao/metainflacao
 */
export const IPCA_META = 4.5;

/**
 * Renda mensal alvo padrão para simulação de aposentadoria (R$ 5.000).
 * Aproximadamente 2× o salário mínimo de 2026 (R$ 1.621) — valor
 * referência para classe média.
 */
export const RENDA_APOSENTADORIA_DEFAULT = 5000;

// ---- Types -----------------------------------------------------------------

/**
 * Parâmetros de entrada para a simulação de aposentadoria (Modo 1).
 * Dado um aporte mensal, projeta quanto o contribuinte poderá retirar
 * mensalmente durante a fase de retiro.
 */
export interface AposentadoriaParams {
  /** Idade atual do contribuinte (anos completos). */
  idadeAtual: number;
  /** Idade planejada para aposentadoria (início dos resgates). */
  idadeAposentadoria: number;
  /** Idade máxima de vida (fim dos resgates, ex: 77 ou 90). */
  idadeMaxima: number;
  /** Saldo atual acumulado no PGBL (R$). */
  saldoAtualPGBL: number;
  /** Aporte mensal em PGBL durante a fase de acumulação (R$). */
  aporteMensalPGBL: number;
  /** Rendimento anual esperado do fundo PGBL (%, ex: 12). */
  rendimentoAnual: number;
  /** Inflação anual esperada (%, ex: 4.5). */
  inflacaoAnual: number;
  /** Regime tributário escolhido para o PGBL. */
  tabelaPGBL: 'regressiva' | 'progressiva';
}

/**
 * Projeção ano a ano da fase de acumulação (contribuições + rendimento).
 */
export interface ProjecaoAcumulacao {
  /** Número do ano (1, 2, 3...). */
  ano: number;
  /** Idade do contribuinte neste ano. */
  idade: number;
  /** Saldo ao final do ano (R$). */
  saldo: number;
  /** Aportes acumulados até este ano (R$). */
  aportesAcum: number;
  /** Rendimento acumulado até este ano (R$). */
  rendimentoAcum: number;
}

/**
 * Projeção ano a ano da fase de retiro (resgates + rendimento residual).
 */
export interface ProjecaoRetiro {
  /** Número do ano de retiro (1, 2, 3...). */
  ano: number;
  /** Idade do contribuinte neste ano. */
  idade: number;
  /** Saldo no início do ano, antes do resgate (R$). */
  saldoInicio: number;
  /** Valor da retirada anual bruta (R$). */
  retiradaAnual: number;
  /** Saldo ao final do ano, após resgate e rendimento (R$). */
  saldoFim: number;
  /** Poder de compra da retirada anual, ajustado pela inflação (R$ de hoje). */
  poderDeCompra: number;
}

/**
 * Resultado completo da simulação de aposentadoria (Modo 1).
 * Inclui métricas de acumulação, retiro e projeções detalhadas.
 */
export interface ResultadoAposentadoria {
  // ---- Fase de acumulação ----
  /** Número de anos de contribuição até a aposentadoria. */
  anosAcumulacao: number;
  /** Saldo total acumulado no momento da aposentadoria (R$). */
  saldoAcumulado: number;
  /** Total de aportes realizados durante toda a acumulação (R$). */
  totalAportado: number;
  /** Total de rendimentos gerados durante a acumulação (R$). */
  totalRendimento: number;

  // ---- Fase de retiro ----
  /** Número de anos de resgate (idadeMaxima - idadeAposentadoria). */
  anosRetiro: number;
  /** Retirada mensal bruta calculada pela fórmula de anuidade (R$). */
  retiradaMensalBruta: number;
  /** Alíquota de IR aplicada sobre o resgate (decimal, ex: 0.10). */
  aliqIRResgate: number;
  /** Imposto de renda mensal sobre a retirada (R$). */
  impostoMensal: number;
  /** Retirada mensal líquida após IR (R$). */
  retiradaMensalLiquida: number;
  /** Retirada mensal em valores reais (poder de compra de hoje, R$). */
  retiradaRealMensal: number;

  // ---- Projeções ----
  /** Projeção ano a ano da fase de acumulação. */
  projecaoAcumulacao: ProjecaoAcumulacao[];
  /** Projeção ano a ano da fase de retiro. */
  projecaoRetiro: ProjecaoRetiro[];
}

/**
 * Parâmetros de entrada para calcular a meta de aposentadoria (Modo 2).
 * Dada uma renda mensal desejada, calcula o aporte mensal necessário.
 */
export interface MetaAposentadoriaParams {
  /** Idade atual do contribuinte (anos completos). */
  idadeAtual: number;
  /** Idade planejada para aposentadoria. */
  idadeAposentadoria: number;
  /** Idade máxima de vida (fim dos resgates). */
  idadeMaxima: number;
  /** Renda mensal líquida desejada na aposentadoria, em valores de hoje (R$). */
  rendaMensalDesejada: number;
  /** Saldo atual acumulado no PGBL (R$). */
  saldoAtualPGBL: number;
  /** Rendimento anual esperado do fundo PGBL (%, ex: 12). */
  rendimentoAnual: number;
  /** Inflação anual esperada (%, ex: 4.5). */
  inflacaoAnual: number;
  /** Regime tributário escolhido para o PGBL. */
  tabelaPGBL: 'regressiva' | 'progressiva';
  /** Renda bruta anual atual do contribuinte (para verificar limite de 12%). */
  rendaAnual: number;
}

/**
 * Resultado do cálculo de meta de aposentadoria (Modo 2).
 * Indica quanto contribuir mensalmente para atingir a renda desejada.
 */
export interface ResultadoMeta {
  /** Saldo necessário no PGBL no momento da aposentadoria (R$). */
  saldoNecessario: number;
  /** Aporte mensal necessário para atingir o saldo (R$). */
  aporteMensalNecessario: number;
  /** Aporte anual necessário (aporteMensal × 12) (R$). */
  aporteAnualNecessario: number;
  /** Percentual da renda anual que o aporte representa (ex: 8.5 para 8,5%). */
  percentualRenda: number;
  /** Se o aporte está dentro do teto dedutível de 12% da renda. */
  dentroDoTeto12: boolean;
  /** Valor anual que excede o teto de 12% (R$ 0 se dentro do limite). */
  gap: number;
  /** Número de anos de acumulação até a aposentadoria. */
  anosAcumulacao: number;
  /** Projeção ano a ano da fase de acumulação até atingir a meta. */
  projecaoAcumulacao: ProjecaoAcumulacao[];
}

// ---- Helper: empty result factories ----------------------------------------

/**
 * Cria um ResultadoAposentadoria zerado (usado quando os parâmetros são inválidos).
 */
function resultadoVazio(anosAcumulacao: number, anosRetiro: number): ResultadoAposentadoria {
  return {
    anosAcumulacao,
    saldoAcumulado: 0,
    totalAportado: 0,
    totalRendimento: 0,
    anosRetiro,
    retiradaMensalBruta: 0,
    aliqIRResgate: 0,
    impostoMensal: 0,
    retiradaMensalLiquida: 0,
    retiradaRealMensal: 0,
    projecaoAcumulacao: [],
    projecaoRetiro: [],
  };
}

// ---- Main Functions --------------------------------------------------------

/**
 * Simula a aposentadoria via PGBL (Modo 1): dado um aporte mensal, projeta
 * a retirada mensal líquida possível durante a fase de retiro.
 *
 * **Fase de acumulação:** compõe o saldo atual com aportes mensais e
 * rendimento composto ao longo dos anos até a aposentadoria.
 *
 * **Fase de retiro:** calcula uma anuidade (retiradas mensais niveladas)
 * que esgota o saldo ao longo dos anos de retiro, descontando IR conforme
 * a tabela escolhida (regressiva ou progressiva).
 *
 * O poder de compra real é calculado deflacionando a retirada líquida
 * pela inflação acumulada no período de acumulação.
 *
 * @param params - Parâmetros da simulação (idade, aportes, taxas, tabela IR)
 * @returns Resultado completo com métricas e projeções ano a ano
 *
 * @example
 * ```ts
 * const resultado = simularAposentadoria({
 *   idadeAtual: 30,
 *   idadeAposentadoria: 60,
 *   idadeMaxima: 77,
 *   saldoAtualPGBL: 50000,
 *   aporteMensalPGBL: 1000,
 *   rendimentoAnual: 10,
 *   inflacaoAnual: 4.5,
 *   tabelaPGBL: 'regressiva',
 * });
 * ```
 *
 * @see {@link calcPGBLAliqRegressiva} — Alíquota regressiva por tempo
 * @see {@link calcPGBLAliqProgressiva} — Alíquota progressiva por valor
 */
export function simularAposentadoria(params: AposentadoriaParams): ResultadoAposentadoria {
  const {
    idadeAtual,
    idadeAposentadoria,
    idadeMaxima,
    saldoAtualPGBL,
    aporteMensalPGBL,
    rendimentoAnual,
    inflacaoAnual,
    tabelaPGBL,
  } = params;

  const anosAcumulacao = idadeAposentadoria - idadeAtual;
  const anosRetiro = idadeMaxima - idadeAposentadoria;

  // Edge cases
  if (anosRetiro <= 0 || anosAcumulacao < 0) {
    return resultadoVazio(Math.max(anosAcumulacao, 0), Math.max(anosRetiro, 0));
  }

  // ---- Phase 1: Accumulation ----
  const rAnual = 1 + rendimentoAnual / 100;
  const aporteAnual = aporteMensalPGBL * 12;

  let saldo = saldoAtualPGBL;
  let aportesAcum = 0;
  const projecaoAcumulacao: ProjecaoAcumulacao[] = [];

  for (let y = 1; y <= anosAcumulacao; y++) {
    aportesAcum += aporteAnual;
    saldo = (saldo + aporteAnual) * rAnual;

    projecaoAcumulacao.push({
      ano: y,
      idade: idadeAtual + y,
      saldo,
      aportesAcum,
      rendimentoAcum: saldo - saldoAtualPGBL - aportesAcum,
    });
  }

  const saldoAcumulado = saldo;
  const totalAportado = aportesAcum;
  const totalRendimento = saldoAcumulado - saldoAtualPGBL - totalAportado;

  if (saldoAcumulado <= 0) {
    return resultadoVazio(anosAcumulacao, anosRetiro);
  }

  // ---- Phase 2: Withdrawal (annuity) ----
  // Monthly real rate: discount inflation from nominal return
  const realAnual = (1 + rendimentoAnual / 100) / (1 + inflacaoAnual / 100) - 1;
  const monthlyRate = Math.pow(1 + realAnual, 1 / 12) - 1;
  const nMeses = anosRetiro * 12;

  let retiradaMensalBruta: number;
  if (monthlyRate === 0) {
    // Zero real rate: simple division
    retiradaMensalBruta = saldoAcumulado / nMeses;
  } else {
    // PMT = PV * r / (1 - (1+r)^-n)
    retiradaMensalBruta =
      (saldoAcumulado * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -nMeses));
  }

  // ---- Phase 3: IR on withdrawal ----
  let aliqIRResgate: number;
  if (tabelaPGBL === 'regressiva') {
    aliqIRResgate = calcPGBLAliqRegressiva(anosAcumulacao);
  } else {
    // Progressive: effective rate based on annual withdrawal
    aliqIRResgate = calcPGBLAliqProgressiva(retiradaMensalBruta * 12);
  }

  const impostoMensal = retiradaMensalBruta * aliqIRResgate;
  const retiradaMensalLiquida = retiradaMensalBruta - impostoMensal;

  // ---- Phase 4: Inflation-adjusted value ----
  const inflationFactor = Math.pow(1 + inflacaoAnual / 100, anosAcumulacao);
  const retiradaRealMensal = retiradaMensalLiquida / inflationFactor;

  // ---- Phase 5: Withdrawal projection ----
  const monthlyNominal = Math.pow(1 + rendimentoAnual / 100, 1 / 12) - 1;
  const retiradaAnualBruta = retiradaMensalBruta * 12;

  let saldoRetiro = saldoAcumulado;
  const projecaoRetiro: ProjecaoRetiro[] = [];

  for (let y = 1; y <= anosRetiro; y++) {
    const saldoInicio = saldoRetiro;

    // Simulate 12 months: each month earn returns then withdraw
    for (let m = 0; m < 12; m++) {
      saldoRetiro = saldoRetiro * (1 + monthlyNominal) - retiradaMensalBruta;
    }

    // Inflation factor at this withdrawal year (from today)
    const inflFactor = Math.pow(1 + inflacaoAnual / 100, anosAcumulacao + y);
    const poderDeCompra = retiradaAnualBruta / inflFactor;

    projecaoRetiro.push({
      ano: y,
      idade: idadeAposentadoria + y,
      saldoInicio,
      retiradaAnual: retiradaAnualBruta,
      saldoFim: Math.max(saldoRetiro, 0),
      poderDeCompra,
    });
  }

  return {
    anosAcumulacao,
    saldoAcumulado,
    totalAportado,
    totalRendimento,
    anosRetiro,
    retiradaMensalBruta,
    aliqIRResgate,
    impostoMensal,
    retiradaMensalLiquida,
    retiradaRealMensal,
    projecaoAcumulacao,
    projecaoRetiro,
  };
}

/**
 * Calcula a meta de aposentadoria via PGBL (Modo 2): dada uma renda mensal
 * líquida desejada (em valores de hoje), determina o aporte mensal necessário.
 *
 * **Algoritmo:**
 * 1. Inflaciona a renda desejada até a data da aposentadoria.
 * 2. Calcula a renda bruta necessária (compensando o IR).
 * 3. Calcula o saldo necessário via valor presente de anuidade.
 * 4. Calcula o aporte mensal necessário via fórmula de valor futuro.
 * 5. Verifica se o aporte está dentro do teto dedutível de 12% da renda.
 *
 * @param params - Parâmetros da meta (renda desejada, idade, taxas, renda atual)
 * @returns Resultado com aporte necessário, projeção e verificação do teto
 *
 * @example
 * ```ts
 * const meta = calcularMetaAposentadoria({
 *   idadeAtual: 30,
 *   idadeAposentadoria: 60,
 *   idadeMaxima: 77,
 *   rendaMensalDesejada: 5000,
 *   saldoAtualPGBL: 50000,
 *   rendimentoAnual: 10,
 *   inflacaoAnual: 4.5,
 *   tabelaPGBL: 'regressiva',
 *   rendaAnual: 120000,
 * });
 * ```
 *
 * @see {@link simularAposentadoria} — Simulação no sentido inverso (aporte → renda)
 * @see {@link calcPGBLAliqRegressiva} — Alíquota regressiva por tempo
 * @see {@link calcPGBLAliqProgressiva} — Alíquota progressiva por valor
 */
export function calcularMetaAposentadoria(params: MetaAposentadoriaParams): ResultadoMeta {
  const {
    idadeAtual,
    idadeAposentadoria,
    idadeMaxima,
    rendaMensalDesejada,
    saldoAtualPGBL,
    rendimentoAnual,
    inflacaoAnual,
    tabelaPGBL,
    rendaAnual,
  } = params;

  const anosAcumulacao = idadeAposentadoria - idadeAtual;
  const anosRetiro = idadeMaxima - idadeAposentadoria;

  // Edge case: no accumulation or withdrawal period
  if (anosAcumulacao <= 0 || anosRetiro <= 0) {
    return {
      saldoNecessario: 0,
      aporteMensalNecessario: 0,
      aporteAnualNecessario: 0,
      percentualRenda: 0,
      dentroDoTeto12: true,
      gap: 0,
      anosAcumulacao: Math.max(anosAcumulacao, 0),
      projecaoAcumulacao: [],
    };
  }

  // ---- Step 1: Inflate target income to retirement date ----
  const inflationFactor = Math.pow(1 + inflacaoAnual / 100, anosAcumulacao);
  const rendaFutura = rendaMensalDesejada * inflationFactor;

  // ---- Step 2: Estimate IR rate and gross income needed ----
  let aliqIR: number;
  if (tabelaPGBL === 'regressiva') {
    aliqIR = calcPGBLAliqRegressiva(anosAcumulacao);
  } else {
    // Progressive: estimate on annualized future income
    // Use iterative approach: start with net, estimate gross, recalculate
    const estimatedGross = rendaFutura / (1 - 0.15); // initial guess at 15%
    aliqIR = calcPGBLAliqProgressiva(estimatedGross * 12);
  }
  const rendaFuturaBruta = rendaFutura / (1 - aliqIR);

  // ---- Step 3: Required balance at retirement (PV of annuity) ----
  const monthlyNominal = Math.pow(1 + rendimentoAnual / 100, 1 / 12) - 1;
  const nMeses = anosRetiro * 12;

  let saldoNecessario: number;
  if (monthlyNominal === 0) {
    saldoNecessario = rendaFuturaBruta * nMeses;
  } else {
    // PV = PMT * (1 - (1+r)^-n) / r
    saldoNecessario =
      rendaFuturaBruta * (1 - Math.pow(1 + monthlyNominal, -nMeses)) / monthlyNominal;
  }

  // ---- Step 4: Required monthly contribution ----
  const nMesesAcum = anosAcumulacao * 12;
  const fvFromPV = saldoAtualPGBL * Math.pow(1 + monthlyNominal, nMesesAcum);
  const remainingFV = saldoNecessario - fvFromPV;

  let aporteMensalNecessario: number;
  if (remainingFV <= 0) {
    // Already have enough from current balance growth
    aporteMensalNecessario = 0;
  } else if (monthlyNominal === 0) {
    aporteMensalNecessario = remainingFV / nMesesAcum;
  } else {
    // PMT = FV * r / ((1+r)^n - 1)
    aporteMensalNecessario =
      remainingFV * monthlyNominal / (Math.pow(1 + monthlyNominal, nMesesAcum) - 1);
  }

  // ---- Step 5: Check against 12% limit ----
  const aporteAnualNecessario = aporteMensalNecessario * 12;
  const percentualRenda = rendaAnual > 0 ? (aporteAnualNecessario / rendaAnual) * 100 : 0;
  const dentroDoTeto12 = percentualRenda <= 12;
  const tetoAnual = rendaAnual * 0.12;
  const gap = dentroDoTeto12 ? 0 : aporteAnualNecessario - tetoAnual;

  // ---- Step 6: Accumulation projection ----
  const rAnual = 1 + rendimentoAnual / 100;
  const aporteAnualCalc = aporteMensalNecessario * 12;

  let saldo = saldoAtualPGBL;
  let aportesAcum = 0;
  const projecaoAcumulacao: ProjecaoAcumulacao[] = [];

  for (let y = 1; y <= anosAcumulacao; y++) {
    aportesAcum += aporteAnualCalc;
    saldo = (saldo + aporteAnualCalc) * rAnual;

    projecaoAcumulacao.push({
      ano: y,
      idade: idadeAtual + y,
      saldo,
      aportesAcum,
      rendimentoAcum: saldo - saldoAtualPGBL - aportesAcum,
    });
  }

  return {
    saldoNecessario,
    aporteMensalNecessario,
    aporteAnualNecessario,
    percentualRenda,
    dentroDoTeto12,
    gap,
    anosAcumulacao,
    projecaoAcumulacao,
  };
}
