// ============================================================================
// IRPF 2026 — Pure Calculation Functions & Constants
// ============================================================================
// Sources:
//   INSS: Portaria Interministerial MPS/MF n. 6/2026
//   IRPF: Lei n. 15.191/2025 (tabela) + Lei n. 15.270/2025 (redutor)
//   Desc. Simplificado: Lei n. 15.270/2025
//   Receita Federal: gov.br/receitafederal/tabelas/2026
// ============================================================================

// -- Interfaces --------------------------------------------------------------

export interface INSSFaixa {
  ate: number;
  aliq: number;
}

export interface IRPFFaixa {
  ate: number;
  aliq: number;
  deducao: number;
}

export interface SimState {
  rendaAnual: number;
  irrfAnual: number;
  inssAnual: number;
  deducaoDependentesAnual: number;
  despMedAnual: number;
  despEduAnual: number;
  pensaoAnual: number;
  pgblMaxAnual: number;
  baseSemPGBL: number;
  impostoSemPGBL: number;
  prevAnualAtual: number;
  impostoCompleto: number;
  impostoSimplificado: number;
  resultadoCompleto: number;
  resultadoSimplificado: number;
  melhorModelo: string;
  descontoSimp: number;
  totalDeducoesAnual: number;
}

export interface SimResult {
  pgblAnual: number;
  baseCompl: number;
  impostoCompl: number;
  resultCompl: number;
  impostoSimp: number;
  resultSimp: number;
  melhor: string;
  impostoFinal: number;
  resultFinal: number;
}

// -- INSS 2026 — Tabela progressiva -----------------------------------------
// Salario minimo R$ 1.621,00 / Teto R$ 8.475,55

export const INSS_FAIXAS: INSSFaixa[] = [
  { ate: 1621.00,  aliq: 0.075 },
  { ate: 2902.84,  aliq: 0.090 },
  { ate: 4354.27,  aliq: 0.120 },
  { ate: 8475.55,  aliq: 0.140 },
];

// Teto = 121.58 + 115.37 + 174.17 + 576.98 = 988.09
export const INSS_TETO_MENSAL = 988.09;

// -- IRPF 2026 — Tabela progressiva ANUAL (Lei 15.191/2025) -----------------

export const IRPF_FAIXAS: IRPFFaixa[] = [
  { ate: 29145.60, aliq: 0.000, deducao: 0        },
  { ate: 33919.80, aliq: 0.075, deducao: 2185.92  },
  { ate: 45012.60, aliq: 0.150, deducao: 4729.91  },
  { ate: 55976.16, aliq: 0.225, deducao: 8105.85  },
  { ate: Infinity, aliq: 0.275, deducao: 10904.66 },
];

// -- Tabela progressiva MENSAL para calculo do IRRF na fonte (Lei 15.191/2025)

export const IRPF_FAIXAS_MENSAL: IRPFFaixa[] = [
  { ate: 2428.80, aliq: 0.000, deducao: 0      },
  { ate: 2826.65, aliq: 0.075, deducao: 182.16 },
  { ate: 3751.05, aliq: 0.150, deducao: 394.16 },
  { ate: 4664.68, aliq: 0.225, deducao: 675.49 },
  { ate: Infinity, aliq: 0.275, deducao: 908.73 },
];

// -- Redutor 2026 (Lei 15.270/2025) — isencao efetiva ate R$ 5.000/mes ------
// Formula anual oficial: redutor = 8.429,73 - (0,095575 x base anual)
// Ate R$ 60.000/ano: redutor zera o imposto (max R$ 2.694,15)
// De R$ 60.000,01 a R$ 88.200: redutor decresce linearmente
// Acima de R$ 88.200: sem redutor

export const REDUTOR_BASE_TETO    = 88200;    // 7.350 * 12
export const REDUTOR_BASE_ISENTO  = 60000;    // 5.000 * 12
export const REDUTOR_COEF_A       = 8429.73;  // constante da formula oficial
export const REDUTOR_COEF_B       = 0.095575; // coeficiente multiplicador

// -- Redutor MENSAL (Lei 15.270/2025): ate R$ 5.000 -> redutor max R$ 312,89
// Formula: 978,62 - (0,133145 x renda bruta mensal)

export const REDUTOR_MENSAL_COEF_A       = 978.62;
export const REDUTOR_MENSAL_COEF_B       = 0.133145;
export const REDUTOR_MENSAL_RENDA_ISENTA = 5000.00;
export const REDUTOR_MENSAL_RENDA_TETO   = 7350.00;

// -- Desconto simplificado 2026 (Lei 15.270/2025) ---------------------------

export const DESC_SIMPLIFICADO_TETO = 17640.00;

// -- Formatting Functions ----------------------------------------------------

/** Format a number as Brazilian Real (R$ X.XXX,XX) */
export function BRL(v: number): string {
  return 'R$ ' + Math.abs(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Format a number as percentage (X,XX%) */
export function PCT(v: number): string {
  return v.toFixed(2).replace('.', ',') + '%';
}

/** Parse a Brazilian currency string to number */
export function parseVal(s: string): number {
  return parseFloat((s || '0').replace(/\./g, '').replace(',', '.')) || 0;
}

// -- INSS Calculation --------------------------------------------------------

/** Calculate monthly INSS contribution (progressive table) */
export function calcINSS(salBrutoMensal: number): number {
  let inss = 0;
  for (let i = 0; i < INSS_FAIXAS.length; i++) {
    const prev = i === 0 ? 0 : INSS_FAIXAS[i - 1].ate;
    const faixa = Math.min(salBrutoMensal, INSS_FAIXAS[i].ate) - prev;
    if (faixa <= 0) break;
    inss += faixa * INSS_FAIXAS[i].aliq;
    if (salBrutoMensal <= INSS_FAIXAS[i].ate) break;
  }
  return Math.min(inss, INSS_TETO_MENSAL);
}

/** Calculate monthly INSS with per-bracket breakdown */
export function calcINSSDetalhado(salBrutoMensal: number): {
  faixas: Array<{ de: number; ate: number; aliq: number; base: number; contrib: number }>;
  total: number;
} {
  const faixas: Array<{ de: number; ate: number; aliq: number; base: number; contrib: number }> = [];
  let total = 0;
  for (let i = 0; i < INSS_FAIXAS.length; i++) {
    const prev = i === 0 ? 0 : INSS_FAIXAS[i - 1].ate;
    const base = Math.min(salBrutoMensal, INSS_FAIXAS[i].ate) - prev;
    if (base <= 0) break;
    const contrib = base * INSS_FAIXAS[i].aliq;
    total += contrib;
    faixas.push({
      de: prev,
      ate: Math.min(salBrutoMensal, INSS_FAIXAS[i].ate),
      aliq: INSS_FAIXAS[i].aliq,
      base,
      contrib,
    });
    if (salBrutoMensal <= INSS_FAIXAS[i].ate) break;
  }
  return { faixas, total: Math.min(total, INSS_TETO_MENSAL) };
}

// -- IRPF Calculation (Annual) -----------------------------------------------

/** Calculate annual IRPF with 2026 redutor (Lei 15.270/2025) */
export function calcIRPF(baseAnual: number): number {
  if (baseAnual <= 0) return 0;
  let imposto = 0;
  for (const f of IRPF_FAIXAS) {
    if (baseAnual <= f.ate) {
      imposto = baseAnual * f.aliq - f.deducao;
      break;
    }
  }
  imposto = Math.max(0, imposto);

  // Aplica redutor 2026 (Lei 15.270/2025)
  // Formula oficial anual: redutor = 8.429,73 - (0,095575 x base anual)
  if (baseAnual <= REDUTOR_BASE_ISENTO) {
    // Ate R$ 60.000/ano: redutor zera o imposto
    imposto = 0;
  } else if (baseAnual < REDUTOR_BASE_TETO) {
    // De R$ 60.000,01 a R$ 88.200: redutor decresce linearmente
    const redutor = REDUTOR_COEF_A - (REDUTOR_COEF_B * baseAnual);
    imposto = Math.max(0, imposto - Math.max(0, redutor));
  }

  return imposto;
}

// -- IRRF Monthly Calculation ------------------------------------------------

/** Calculate monthly IRRF withheld at source */
export function calcIRRFMensal(rendaBrutaMensal: number): number {
  // Base = renda - INSS - desconto simplificado mensal (R$ 607,20)
  const inss = calcINSS(rendaBrutaMensal);
  const descSimplificadoMensal = 607.20;
  const base = rendaBrutaMensal - inss - descSimplificadoMensal;
  if (base <= 0) return 0;

  let imposto = 0;
  for (const f of IRPF_FAIXAS_MENSAL) {
    if (base <= f.ate) {
      imposto = base * f.aliq - f.deducao;
      break;
    }
  }
  imposto = Math.max(0, imposto);

  // Aplica redutor mensal
  if (rendaBrutaMensal <= REDUTOR_MENSAL_RENDA_ISENTA) {
    imposto = 0;
  } else if (rendaBrutaMensal < REDUTOR_MENSAL_RENDA_TETO) {
    const redutor = REDUTOR_MENSAL_COEF_A - (REDUTOR_MENSAL_COEF_B * rendaBrutaMensal);
    imposto = Math.max(0, imposto - Math.max(0, redutor));
  }

  return imposto;
}

// -- PGBL Simulation ---------------------------------------------------------

/** Simulate tax result for a given annual PGBL contribution */
export function simulaPGBL(st: SimState, pgblAnual: number): SimResult {
  // Completo: deducoes legais + PGBL
  const deducoesBase = st.inssAnual + st.deducaoDependentesAnual + st.despMedAnual + st.despEduAnual + st.pensaoAnual;
  const baseCompl = Math.max(0, st.rendaAnual - deducoesBase - pgblAnual);
  const impostoCompl = calcIRPF(baseCompl);
  const resultCompl = impostoCompl - st.irrfAnual;
  // Simplificado: nao muda com PGBL
  const baseSimp = Math.max(0, st.rendaAnual - Math.min(st.rendaAnual * 0.20, DESC_SIMPLIFICADO_TETO));
  const impostoSimp = calcIRPF(baseSimp);
  const resultSimp = impostoSimp - st.irrfAnual;
  // Melhor modelo
  const melhor = impostoCompl <= impostoSimp ? 'completo' : 'simplificado';
  const impostoFinal = Math.min(impostoCompl, impostoSimp);
  const resultFinal = melhor === 'completo' ? resultCompl : resultSimp;
  return { pgblAnual, baseCompl, impostoCompl, resultCompl, impostoSimp, resultSimp, melhor, impostoFinal, resultFinal };
}

// -- Minimum PGBL Contribution Finder ----------------------------------------

/** Find minimum PGBL contribution to achieve zero or negative tax result */
export function findAporteMinimo(st: SimState): { aporte: number; resultado: SimResult } {
  // Se o resultado sem PGBL ja e restituicao, aporte minimo = 0
  const semPGBL = simulaPGBL(st, 0);
  if (semPGBL.resultFinal <= 0) return { aporte: 0, resultado: semPGBL };
  // Busca binaria: menor aporte que faz resultado <= 0
  let lo = 0;
  let hi = st.pgblMaxAnual;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const sim = simulaPGBL(st, mid);
    if (sim.resultFinal > 0) lo = mid; else hi = mid;
  }
  const aporte = Math.ceil(hi / 12) * 12; // arredonda para multiplo de 12 (facilita dividir em meses)
  return { aporte, resultado: simulaPGBL(st, aporte) };
}
