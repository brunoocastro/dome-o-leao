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

/**
 * Percentual do desconto simplificado sobre a renda tributável.
 * O contribuinte pode optar por deduzir 20% da renda bruta (limitado ao teto)
 * em vez de declarar deduções individuais.
 *
 * @see Lei nº 15.270/2025
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 */
export const DESC_SIMPLIFICADO_PERCENTUAL = 0.20;

/**
 * Limite máximo de dedução por PGBL/FAPI: 12% da renda bruta tributável anual.
 * Aportes acima desse percentual não são dedutíveis do IRPF.
 *
 * @see Art. 11 da Lei nº 9.532/1997
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 */
export const PGBL_LIMITE_PERCENTUAL = 0.12;

/**
 * Valor mensal de dedução por dependente no IRPF.
 * Cada dependente (filho, cônjuge sem renda, etc.) permite deduzir esse valor
 * da base de cálculo mensal. O valor anual é este × 12 = R$ 2.275,08.
 *
 * @see Receita Federal — Tabelas IRPF 2026
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 */
export const DEPENDENTE_DEDUCAO_MENSAL = 189.59;

/**
 * Limite anual de dedução por despesas de educação por pessoa.
 * Aplica-se ao titular e a cada dependente individualmente.
 * Inclui: ensino infantil, fundamental, médio, superior, pós-graduação.
 * Não inclui: cursos livres, idiomas, preparatórios.
 *
 * @see Receita Federal — Tabelas IRPF 2026
 * @see https://www.contabeis.com.br/noticias/75860/imposto-de-renda-2026-veja-os-limites-de-deducao/
 */
export const DESPESA_EDUCACAO_LIMITE_POR_PESSOA = 3561.50;

/**
 * Desconto simplificado mensal aplicado no cálculo do IRRF na fonte.
 * Equivale a 25% do limite da faixa isenta mensal (R$ 2.428,80 × 0.25 = R$ 607,20).
 * Usado pela fonte pagadora como alternativa às deduções legais no cálculo mensal.
 *
 * @see Receita Federal — Exemplos de aplicação da Lei 15.270/2025
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-191-2025
 */
export const DESC_SIMPLIFICADO_MENSAL = 607.20;

/**
 * Alíquota máxima da tabela progressiva do IRPF (último bracket).
 * Usada como limite superior em estimativas de alíquota marginal.
 *
 * @see Tabela Progressiva IRPF 2026 — Lei nº 15.191/2025
 */
export const IRPF_ALIQUOTA_MAXIMA = 0.275;

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

/**
 * Calcula a contribuição mensal do INSS pela tabela progressiva.
 * Cada faixa salarial tem uma alíquota própria, aplicada apenas sobre a
 * porção do salário dentro daquela faixa (sistema progressivo, não cumulativo).
 *
 * Faixas 2026: 7,5% (até R$ 1.621) | 9% (até R$ 2.902,84) |
 *              12% (até R$ 4.354,27) | 14% (até R$ 8.475,55)
 *
 * @param salBrutoMensal - Salário bruto mensal do contribuinte
 * @returns Valor da contribuição mensal do INSS (limitado ao teto de R$ 988,09)
 *
 * @see Portaria Interministerial MPS/MF nº 6/2026
 * @see https://www.contabilizei.com.br/contabilidade-online/tabela-inss/
 */
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

/**
 * Calcula o INSS mensal com detalhamento por faixa (para tooltip/exibição).
 * Retorna o valor de cada faixa separadamente para visualização progressiva.
 *
 * @param salBrutoMensal - Salário bruto mensal
 * @returns Objeto com array de faixas detalhadas e total da contribuição
 *
 * @see Portaria Interministerial MPS/MF nº 6/2026
 */
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

/**
 * Calcula o IRPF anual com o redutor de imposto de 2026 (Lei 15.270/2025).
 *
 * Etapas do cálculo:
 * 1. Aplica a tabela progressiva anual (Lei 15.191/2025): base × alíquota - parcela a deduzir
 * 2. Aplica o redutor de 2026 (Lei 15.270/2025):
 *    - Base ≤ R$ 60.000/ano: imposto zerado (isenção efetiva até R$ 5.000/mês)
 *    - Base entre R$ 60.000,01 e R$ 88.200: redutor = 8.429,73 - (0,095575 × base)
 *    - Base > R$ 88.200: sem redutor
 *
 * @param baseAnual - Base de cálculo anual (rendimentos - deduções)
 * @returns Imposto de renda anual após aplicação do redutor
 *
 * @see Lei nº 15.191/2025 — Tabela progressiva
 * @see Lei nº 15.270/2025 — Redutor de imposto
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 */
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

/**
 * Calcula o IRRF (Imposto Retido na Fonte) mensal.
 * Este é o valor que a empresa desconta do salário todo mês e repassa à Receita.
 *
 * Etapas:
 * 1. Base = Renda bruta - INSS - Desconto simplificado mensal (R$ 607,20)
 * 2. Aplica tabela progressiva mensal (Lei 15.191/2025)
 * 3. Aplica redutor mensal (Lei 15.270/2025):
 *    - Renda ≤ R$ 5.000: imposto zerado
 *    - R$ 5.000,01 a R$ 7.350: redutor = 978,62 - (0,133145 × renda)
 *    - Renda > R$ 7.350: sem redutor
 *
 * @param rendaBrutaMensal - Renda bruta mensal (salário + pro-labore)
 * @returns Valor do IRRF mensal retido na fonte
 *
 * @see Lei nº 15.191/2025 — Tabela progressiva mensal
 * @see Lei nº 15.270/2025 — Redutor mensal
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-191-2025
 */
export function calcIRRFMensal(rendaBrutaMensal: number): number {
  const inss = calcINSS(rendaBrutaMensal);
  const base = rendaBrutaMensal - inss - DESC_SIMPLIFICADO_MENSAL;
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

// -- Deduction & Rate Helper Functions ----------------------------------------

/**
 * Calcula a dedução total por dependentes (valor anual).
 * Cada dependente permite deduzir R$ 189,59/mês (R$ 2.275,08/ano) da base de cálculo.
 *
 * @param dependentes - Número de dependentes declarados
 * @returns Valor anual da dedução por dependentes
 *
 * @see Receita Federal — Tabelas IRPF 2026
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 */
export function calcDeducaoDependentesAnual(dependentes: number): number {
  return dependentes * DEPENDENTE_DEDUCAO_MENSAL * 12;
}

/**
 * Calcula o limite anual de dedução por despesas de educação.
 * O limite é de R$ 3.561,50 por pessoa (titular + cada dependente).
 *
 * @param valorInformado - Total de despesas de educação declarado pelo contribuinte
 * @param dependentes - Número de dependentes (o titular é contado automaticamente)
 * @returns Valor dedutível (menor entre o informado e o limite legal)
 *
 * @see Receita Federal — Limites de dedução IRPF 2026
 * @see https://www.contabeis.com.br/noticias/75860/imposto-de-renda-2026-veja-os-limites-de-deducao/
 */
export function calcDeducaoEducacao(valorInformado: number, dependentes: number): number {
  return Math.min(valorInformado, DESPESA_EDUCACAO_LIMITE_POR_PESSOA * (dependentes + 1));
}

/**
 * Calcula o desconto simplificado (20% da renda, limitado ao teto).
 * Alternativa à declaração completa com deduções legais.
 * O contribuinte pode optar por deduzir 20% da renda bruta tributável
 * ao invés de declarar cada dedução individualmente.
 *
 * @param rendaAnual - Renda bruta tributável anual
 * @returns Valor do desconto simplificado
 *
 * @see Lei nº 15.270/2025 — Teto: R$ 17.640,00
 * @see https://www.sager.adv.br/novo-limite-desconto-simplificado-irpf-2026/
 */
export function calcDescontoSimplificado(rendaAnual: number): number {
  return Math.min(rendaAnual * DESC_SIMPLIFICADO_PERCENTUAL, DESC_SIMPLIFICADO_TETO);
}

/**
 * Calcula o teto de dedução por PGBL/FAPI (12% da renda bruta tributável).
 * Aportes em previdência complementar (PGBL ou FAPI) são dedutíveis até
 * 12% da renda bruta anual, desde que o contribuinte também contribua
 * para o INSS (RGPS ou RPPS).
 *
 * @param rendaAnual - Renda bruta tributável anual
 * @returns Valor máximo dedutível em PGBL/FAPI
 *
 * @see Art. 11 da Lei nº 9.532/1997
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 */
export function calcPGBLMaxAnual(rendaAnual: number): number {
  return rendaAnual * PGBL_LIMITE_PERCENTUAL;
}

/**
 * Calcula a alíquota efetiva do imposto de renda.
 * É a razão entre o imposto devido e a renda bruta, expressa em percentual.
 * Diferente da alíquota nominal (da faixa), a efetiva reflete o imposto
 * real pago sobre toda a renda.
 *
 * @param impostoFinal - Imposto apurado após todas as deduções e redutor
 * @param rendaAnual - Renda bruta tributável anual
 * @returns Alíquota efetiva em percentual (ex: 15.5 para 15,5%)
 *
 * @example
 * calcAliquotaEfetiva(23844, 144000) // → 16.56
 */
export function calcAliquotaEfetiva(impostoFinal: number, rendaAnual: number): number {
  return rendaAnual > 0 ? (impostoFinal / rendaAnual) * 100 : 0;
}

/**
 * Estima a alíquota marginal do IRPF a partir da alíquota efetiva.
 * A alíquota marginal é a taxa da faixa onde incide o próximo real de renda.
 * Como a tabela é progressiva, a marginal é sempre maior que a efetiva.
 *
 * Heurística: alíquota efetiva × 1.5, limitada à alíquota máxima (27,5%).
 * Fallback: 15% quando a efetiva é zero (contribuinte isento).
 *
 * Exemplos de conversão:
 *   - Efetiva 10% → Marginal ~15%
 *   - Efetiva 15% → Marginal ~22,5%
 *   - Efetiva 18% → Marginal ~27% (limitada a 27,5%)
 *
 * @param aliqEfetiva - Alíquota efetiva em decimal (ex: 0.165 para 16,5%)
 * @returns Alíquota marginal estimada em decimal (ex: 0.2475)
 *
 * @remarks Esta é uma estimativa. A marginal real depende da faixa exata
 * da tabela progressiva. Para precisão, seria necessário identificar
 * a faixa da base de cálculo na tabela da Lei 15.191/2025.
 *
 * @see Tabela Progressiva IRPF 2026 — faixas: 0%, 7,5%, 15%, 22,5%, 27,5%
 * @see https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 */
export function estimarAliquotaMarginal(aliqEfetiva: number): number {
  if (aliqEfetiva <= 0) return 0.15;
  return Math.min(aliqEfetiva * 1.5, IRPF_ALIQUOTA_MAXIMA);
}

/**
 * Ajusta o cálculo do INSS para servidores públicos (RPPS).
 * Servidores públicos federais contribuem pelo Regime Próprio de Previdência
 * Social (RPPS) com alíquota de 11% sobre a remuneração, diferente do RGPS
 * (regime geral) que usa tabela progressiva de 7,5% a 14%.
 *
 * Fórmula: converte o valor calculado pelo RGPS para a base RPPS,
 * aplicando a alíquota de 11%.
 *
 * @param inssRGPS - Valor calculado pela tabela progressiva do RGPS
 * @returns Valor ajustado para o RPPS, limitado ao teto do INSS
 *
 * @remarks Esta é uma aproximação. O cálculo real do RPPS varia conforme
 * o regime do servidor (federal, estadual, municipal) e pode ter regras
 * específicas. Consulte o RH do órgão para o valor exato.
 *
 * @see Portaria Interministerial MPS/MF nº 6/2026
 */
export function adjustINSSParaServidor(inssRGPS: number): number {
  return Math.min(inssRGPS * 1.14 / 0.14 * 0.11, INSS_TETO_MENSAL);
}

// -- PGBL Simulation ---------------------------------------------------------

/**
 * Simula o resultado tributário para um dado aporte anual em PGBL.
 * Compara o modelo de Declaração Completa (com deduções legais + PGBL)
 * contra o Desconto Simplificado (20% da renda, sem PGBL).
 *
 * @param st - Estado da simulação com todos os dados do contribuinte
 * @param pgblAnual - Valor anual do aporte em PGBL a simular
 * @returns Resultado com imposto apurado, resultado (restituição/a pagar) e modelo vencedor
 *
 * @see Lei nº 15.191/2025 — Tabela progressiva IRPF 2026
 * @see Lei nº 15.270/2025 — Redutor de imposto e desconto simplificado
 */
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

/**
 * Encontra o aporte mínimo em PGBL para zerar o imposto a pagar.
 * Usa busca binária para encontrar o menor valor de aporte que faz
 * o resultado (imposto apurado - IRRF pago) ser ≤ 0.
 *
 * Se o resultado já é restituição sem PGBL, retorna aporte = 0.
 * O valor retornado é arredondado para múltiplo de 12 (facilita dividir em meses).
 *
 * @param st - Estado da simulação com dados do contribuinte
 * @returns Objeto com o aporte mínimo e o resultado da simulação com esse aporte
 *
 * @see {@link simulaPGBL} — Função de simulação usada internamente
 */
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
