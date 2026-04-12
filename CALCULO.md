# Metodologia de Calculo — DomeoLeao (Simulador IRPF 2026)

Este documento descreve cada conceito, formula e fonte oficial utilizada como base para os calculos do DomeoLeao — Simulador IRPF 2026 com Estrategia PGBL/FAPI e Comparativo de Investimentos.

---

## 1. INSS — Contribuicao Previdenciaria

### Conceito

O INSS (Instituto Nacional do Seguro Social) utiliza uma **tabela progressiva** para calcular a contribuicao do trabalhador. Cada faixa salarial tem uma aliquota propria, aplicada apenas sobre a porcao do salario dentro daquela faixa — semelhante ao imposto de renda progressivo.

### Tabela 2026

| Faixa Salarial | Aliquota |
|---|---|
| Ate R$ 1.621,00 | 7,5% |
| De R$ 1.621,01 a R$ 2.902,84 | 9,0% |
| De R$ 2.902,85 a R$ 4.354,27 | 12,0% |
| De R$ 4.354,28 a R$ 8.475,55 | 14,0% |

- **Teto de contribuicao**: R$ 988,09/mes
- **Salario minimo 2026**: R$ 1.621,00
- **Teto do INSS 2026**: R$ 8.475,55

### Formula

```
Para cada faixa i:
  base_i = min(salario, teto_faixa_i) - teto_faixa_(i-1)
  contrib_i = base_i * aliquota_i

INSS_total = sum(contrib_i) para todas as faixas onde base_i > 0
INSS_final = min(INSS_total, 988.09)
```

### Fontes

- [Portaria Interministerial MPS/MF n. 6/2026](https://www.gov.br/previdencia) — Tabela oficial INSS 2026
- [Contabilizei — Tabela INSS 2026](https://www.contabilizei.com.br/contabilidade-online/tabela-inss/) — Aliquotas progressivas e teto

---

## 2. IRPF — Imposto de Renda Pessoa Fisica

### Conceito

O IRPF incide sobre a **base de calculo** (rendimentos tributaveis menos deducoes). Utiliza tabela progressiva anual onde cada faixa tem aliquota e parcela a deduzir.

### Tabela Progressiva Anual 2026 (Lei 15.191/2025)

| Base de Calculo Anual | Aliquota | Parcela a Deduzir |
|---|---|---|
| Ate R$ 29.145,60 | Isento | — |
| De R$ 29.145,61 a R$ 33.919,80 | 7,5% | R$ 2.185,92 |
| De R$ 33.919,81 a R$ 45.012,60 | 15,0% | R$ 4.729,91 |
| De R$ 45.012,61 a R$ 55.976,16 | 22,5% | R$ 8.105,85 |
| Acima de R$ 55.976,16 | 27,5% | R$ 10.904,66 |

### Tabela Progressiva Mensal 2026

| Base de Calculo Mensal | Aliquota | Parcela a Deduzir |
|---|---|---|
| Ate R$ 2.428,80 | Isento | — |
| De R$ 2.428,81 a R$ 2.826,65 | 7,5% | R$ 182,16 |
| De R$ 2.826,66 a R$ 3.751,05 | 15,0% | R$ 394,16 |
| De R$ 3.751,06 a R$ 4.664,68 | 22,5% | R$ 675,49 |
| Acima de R$ 4.664,68 | 27,5% | R$ 908,73 |

### Formula

```
Imposto = Base_Anual * Aliquota_da_Faixa - Parcela_a_Deduzir
```

### Fontes

- [Receita Federal — Tabelas IRPF 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026) — Tabela oficial
- [Lei n. 15.191/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15191.htm) — Tabela progressiva

---

## 3. Redutor de Imposto 2026 (Lei 15.270/2025)

### Conceito

A partir de janeiro de 2026, foi instituido um **redutor de imposto** que garante isencao efetiva para quem ganha ate R$ 5.000/mes, com reducao gradual ate R$ 7.350/mes. A tabela progressiva nao foi alterada — o redutor e aplicado **apos** o calculo do imposto pela tabela.

### Formula Mensal

```
Se renda_mensal <= R$ 5.000:
  redutor = ate R$ 312,89 (zera o imposto)
Se R$ 5.000,01 <= renda_mensal <= R$ 7.350:
  redutor = 978,62 - (0,133145 * renda_mensal)
Se renda_mensal > R$ 7.350:
  redutor = 0 (sem reducao)
```

### Formula Anual

```
Se base_anual <= R$ 60.000:
  redutor = ate R$ 2.694,15 (zera o imposto)
Se R$ 60.000,01 <= base_anual <= R$ 88.200:
  redutor = 8.429,73 - (0,095575 * base_anual)
Se base_anual > R$ 88.200:
  redutor = 0 (sem reducao)

Imposto_Final = max(0, Imposto_Tabela - Redutor)
```

### Fontes

- [Gov.br — Nova Tabela IR 2026: isencao ate R$ 5 mil](https://www.gov.br/secom/pt-br/acompanhe-a-secom/noticias/2026/01/nova-tabela-do-ir-veja-faixas-e-aliquotas-e-saiba-mais-sobre-medida-que-isenta-o-pagamento-para-quem-ganha-ate-r-5-mil)
- [Receita Federal — Exemplos de aplicacao da Lei 15.270/2025](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-191-2025)
- [Lei n. 15.270/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm) — Instituicao do redutor

---

## 4. Deducoes Legais

### 4.1 Dependentes

Cada dependente permite deduzir **R$ 189,59/mes** (R$ 2.275,08/ano) da base de calculo.

### 4.2 Despesas Medicas

Despesas com saude (plano de saude, consultas, cirurgias, exames) sao dedutiveis **sem limite**, desde que comprovadas por nota fiscal ou recibo.

### 4.3 Despesas de Educacao

Gastos com educacao formal (escola, faculdade) sao dedutiveis ate **R$ 3.561,50/ano por pessoa** (titular + cada dependente).

### 4.4 Pensao Alimenticia

Pensao alimenticia **judicial** e integralmente dedutivel, sem limite.

### 4.5 INSS

O valor pago de INSS e integralmente dedutivel da base de calculo.

### Fontes

- [Receita Federal — Tabelas 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026) — Valores de deducao
- [Contabeis — Limites de deducao IR 2026](https://www.contabeis.com.br/noticias/75860/imposto-de-renda-2026-veja-os-limites-de-deducao/)

---

## 5. Desconto Simplificado

### Conceito

Alternativa as deducoes legais. O contribuinte pode optar por um desconto de **20% sobre os rendimentos tributaveis**, limitado a **R$ 17.640,00/ano** (Lei 15.270/2025).

### Formula

```
Desconto = min(Renda_Anual * 0.20, 17640.00)
Base_Simplificada = Renda_Anual - Desconto
```

### Quando Usar

O simulador calcula ambos os modelos e recomenda o que resulta em menor imposto.

### Fontes

- [Lei n. 15.270/2025](https://www.sager.adv.br/novo-limite-desconto-simplificado-irpf-2026/) — Novo teto R$ 17.640,00

---

## 6. IRRF — Imposto Retido na Fonte

### Conceito

O IRRF e o imposto que a empresa desconta do salario todo mes e repassa a Receita Federal. Na declaracao anual, o IRRF e subtraido do imposto apurado:

- Se IRRF > Imposto Apurado: **restituicao**
- Se IRRF < Imposto Apurado: **imposto a pagar**

### Formula do IRRF Mensal

```
Base_IRRF = Salario_Bruto - INSS - Desconto_Simplificado_Mensal(R$ 607,20)
IRRF = Base_IRRF * Aliquota_Mensal - Parcela_a_Deduzir - Redutor_Mensal
```

### Formula do Resultado Final

```
Resultado = Imposto_Apurado - IRRF_Anual
Se Resultado < 0: Restituicao
Se Resultado > 0: Imposto a Pagar
```

---

## 7. PGBL/FAPI — Previdencia Complementar

### Conceito

O PGBL (Plano Gerador de Beneficio Livre) e o FAPI (Fundo de Aposentadoria Programada Individual) permitem deduzir ate **12% da renda bruta tributavel anual** da base de calculo do IRPF. Isso reduz o imposto no ano do aporte, mas o valor resgatado sera tributado integralmente no futuro.

### Limite de Deducao

```
Teto_PGBL = Renda_Bruta_Anual * 0.12
```

### Tabela Regressiva de Tributacao (Resgate PGBL)

| Periodo de Acumulacao | Aliquota |
|---|---|
| Ate 2 anos | 35% |
| De 2 a 4 anos | 30% |
| De 4 a 6 anos | 25% |
| De 6 a 8 anos | 20% |
| De 8 a 10 anos | 15% |
| Acima de 10 anos | 10% |

**Importante**: No PGBL, o imposto incide sobre o **valor total** do resgate (aporte + rendimento), pois os aportes foram deduzidos da base do IR. No VGBL, o imposto incide apenas sobre os **rendimentos**.

### Tabela Progressiva (Alternativa)

O contribuinte pode optar pela tabela progressiva no resgate, onde o valor resgatado e tributado pelas faixas normais do IRPF (0% a 27,5%). Mais vantajosa para resgates de baixo valor.

### Fontes

- [Suno — Tributacao do PGBL](https://www.suno.com.br/artigos/tributacao-do-pgbl/) — Tabela regressiva
- [Cidesp — PGBL Tabela Regressiva](https://cidesp.com.br/blog/pgbl-tabela-regressiva) — Periodos e aliquotas

---

## 8. Comparativo de Investimentos — Longo Prazo

### Conceito

O simulador compara duas estrategias ao longo do tempo:

**Cenario A — PGBL no Teto (12%)**
- Aporte integral no teto do PGBL
- Beneficio fiscal anual (economia de IR) reinvestido
- Resgate tributado pela tabela regressiva (sobre o valor total)

**Cenario B — PGBL Minimo + Investimento Alternativo**
- Aporte minimo no PGBL (apenas o suficiente para nao "perder" IR)
- Diferenca aplicada em investimento alternativo
- PGBL resgatado pela tabela regressiva
- Alternativo tributado conforme tipo (15% sobre lucro, isento, etc.)

### Investimentos Alternativos Considerados

| Investimento | Rentabilidade (% a.a.) | Tributacao |
|---|---|---|
| Tesouro Selic | 14,75% | 15% sobre ganhos (>720 dias) |
| CDB 100% CDI | 14,50% | 15% sobre ganhos (>720 dias) |
| CDB 110% CDI | 15,95% | 15% sobre ganhos (>720 dias) |
| LCI/LCA 91% CDI | 13,20% | **Isento de IR** |
| FIIs (media div. yield) | 10,00% | **Dividendos isentos** |
| Acoes (IBOV media) | 12,00% | 15% sobre ganhos |

### Tributacao de Renda Fixa (CDB, Tesouro Direto)

| Periodo | Aliquota |
|---|---|
| Ate 180 dias | 22,5% |
| De 181 a 360 dias | 20,0% |
| De 361 a 720 dias | 17,5% |
| Acima de 720 dias | 15,0% |

### Formula de Projecao

```
# Cenario A: PGBL no Teto
Para cada ano y:
  pgbl_saldo[y] = (pgbl_saldo[y-1] + aporte_anual) * (1 + rendimento_pgbl)
  beneficio_ir[y] = (beneficio_ir[y-1] + aporte_anual * aliq_marginal_ir) * (1 + rend_alt)
  
  # Resgate hipotetico no ano y:
  aliq_resgate = tabela_regressiva(y)
  pgbl_liquido = pgbl_saldo * (1 - aliq_resgate)
  pgbl_total_real = pgbl_liquido + beneficio_ir

# Cenario B: Minimo PGBL + Alternativo
Para cada ano y:
  pgbl_min[y] = (pgbl_min[y-1] + aporte_minimo) * (1 + rendimento_pgbl)
  alt[y] = (alt[y-1] + (aporte_teto - aporte_minimo)) * (1 + rend_alt)
  
  # Resgate hipotetico:
  pgbl_min_ir = pgbl_min * aliq_resgate
  alt_ganhos = alt - aportes_acumulados
  alt_ir = isento ? 0 : alt_ganhos * ir_aliq_alt
  mix_liquido = (pgbl_min - pgbl_min_ir) + (alt - alt_ir)
  mix_total_real = mix_liquido + beneficio_ir_minimo
```

### Fontes

- Selic: [Banco Central — Taxa Selic](https://www.bcb.gov.br/controleinflacao/taxaselic) — 14,75% a.a. (2026)
- Renda Fixa: [B3 Bora Investir — Rendimentos com Selic](https://borainvestir.b3.com.br/tipos-de-investimentos/renda-fixa/como-ficam-os-rendimentos-dos-investimentos-com-a-manutencao-da-taxa-selic-em-15-ao-ano/)
- FIIs: [InfoMoney — FIIs que mais pagam dividendos](https://www.infomoney.com.br/onde-investir/fiis-mais-pagam-dividendos-2025/)
- Tributacao investimentos: [B3 — Taxacao de FII, LCI, LCA, CDB](https://borainvestir.b3.com.br/noticias/imposto-de-renda/taxacao-de-fii-lci-lca-cdb-e-outros-veja-como-ficam-os-impostos-sobre-investimentos/)

---

## 9. Legislacao de Referencia

| Lei / Norma | Assunto |
|---|---|
| Lei 15.191/2025 | Tabela progressiva IRPF 2026 (mensal e anual) |
| Lei 15.270/2025 | Redutor de imposto (isencao ate R$ 5.000) e desconto simplificado (R$ 17.640) |
| Portaria MPS/MF 6/2026 | Tabela INSS 2026 (aliquotas e teto) |
| Lei 11.053/2004 | Tabela regressiva para previdencia complementar (PGBL/VGBL) |
| Lei 9.250/1995 | Regras gerais do IRPF (deducoes, dependentes) |
| IN RFB 1.500/2014 | Retencao de IR na fonte (IRRF) |

---

## 10. Limitacoes e Avisos

- Os valores de rentabilidade dos investimentos sao **estimativas baseadas em medias historicas e taxas vigentes em 2026**. Rentabilidade passada nao garante retorno futuro.
- A Selic pode ser alterada pelo COPOM a qualquer momento.
- O simulador nao substitui consultoria financeira ou contabil profissional.
- Valores arredondados podem gerar pequenas diferencas em relacao ao calculo oficial da Receita Federal.
- A MP 1303/2025, que propunha unificacao de aliquotas de investimentos, **perdeu validade** sem ser convertida em lei. As regras tradicionais permanecem vigentes.
