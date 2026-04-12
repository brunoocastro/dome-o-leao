<p align="center">
  <img src="https://img.shields.io/badge/ano--calend%C3%A1rio-2026-2ea043?style=for-the-badge" alt="Ano-Calendário 2026" />
  <img src="https://img.shields.io/badge/Next.js-15-000?style=for-the-badge&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vercel-Deploy-000?style=for-the-badge&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/licen%C3%A7a-MIT-blue?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">Dome o Leao<br/><sub>Simulador IRPF 2026 — Pague o Minimo, Receba o Maximo</sub></h1>

<p align="center">
  <strong>O leao do Imposto de Renda so ruge pra quem nao tem os numeros certos. Descubra quanto pagar, quanto receber e onde investir pra ele ficar mansinho.</strong>
</p>

<p align="center">
  <a href="#-o-que-faz">O que faz</a> ·
  <a href="#-por-que-este-e-diferente">Por que e diferente</a> ·
  <a href="#%EF%B8%8F-funcionalidades">Funcionalidades</a> ·
  <a href="#-comecar">Comecar</a> ·
  <a href="#-como-funciona">Como funciona</a> ·
  <a href="#-fontes-oficiais">Fontes</a> ·
  <a href="#-contribuir">Contribuir</a>
</p>

---

## O que faz

Um simulador completo de Imposto de Renda Pessoa Fisica para o ano-calendario 2026 que vai alem do calculo basico: alem de mostrar quanto voce deve ou vai restituir, ele responde a pergunta que nenhum outro simulador responde:

> **"Depois de todos os impostos, vale mais a pena colocar o teto no PGBL ou investir o minimo e aplicar o resto na Selic, CDB, LCI, FIIs ou acoes?"**

---

## Por que este e diferente

A maioria dos simuladores de IRPF para no calculo do imposto. Alguns recomendam o PGBL. Mas **nenhum** mostra o que acontece **depois** — quando voce resgata o PGBL e paga 10-35% sobre o valor total, enquanto na Selic voce pagaria 15% apenas sobre o lucro.

| Funcionalidade | Receita Federal | Simuladores comuns | **Este simulador** |
|---|:---:|:---:|:---:|
| Calculo IRPF com tabela 2026 | Sim | Sim | Sim |
| Redutor de imposto (Lei 15.270/2025) | Sim | Alguns | Sim |
| IRRF e resultado (restituicao/pagar) | Sim | Raro | Sim |
| Comparativo Completo vs Simplificado | Sim | Sim | Sim |
| Estrategia PGBL — aporte ideal | - | Alguns | Sim |
| Aporte minimo para nao "perder dinheiro" | - | - | **Sim** |
| Calculadora interativa de aportes | - | - | **Sim** |
| Projecao longo prazo (1-30 anos) | - | - | **Sim** |
| PGBL vs Selic/CDB/LCI/FIIs/Acoes | - | - | **Sim** |
| Considera imposto no resgate PGBL | - | - | **Sim** |
| Considera imposto no lucro da alternativa | - | - | **Sim** |
| Reinvestimento do beneficio fiscal | - | - | **Sim** |
| Grafico de evolucao patrimonial | - | - | **Sim** |
| Tabela regressiva vs progressiva PGBL | - | - | **Sim** |
| Open source e gratuito | - | Parcial | **Sim** |

---

## Funcionalidades

### Etapa 1 — Coleta de Dados
- Salario bruto mensal ou renda anual
- Outras fontes de renda tributavel
- INSS automatico (tabela progressiva) ou manual, com tooltip detalhado por faixa
- IRRF automatico ou manual (para validar contra o Informe de Rendimentos)
- Dependentes, despesas medicas, educacao, pensao alimenticia
- Previdencia complementar (PGBL/VGBL) com aportes mensais e esporadicos

### Etapa 2 — Calculo do Imposto
- Tabela progressiva IRPF 2026 com redutor (Lei 15.270/2025)
- Comparativo automatico: **Deducoes Legais vs Desconto Simplificado**
- Imposto apurado, IRRF pago, e **resultado final** (restituicao ou a pagar)
- Aliquota efetiva com barra visual

### Etapa 3 — Estrategia PGBL/FAPI
- Aporte ideal (teto 12%) com economia de IR em reais
- **Aporte minimo** para resultado zero (nao pagar IR "a toa")
- Grafico de barras comparando cenarios (0%, 25%, 50%, 75%, 100% do teto)
- Calculadora interativa com slider + campos editaveis

### Etapa 4 — Comparativo de Longo Prazo
- Projecao de 1 a 30 anos
- **PGBL no teto** (com beneficio fiscal reinvestido) vs **PGBL minimo + investimento alternativo**
- 7 tipos de investimento: Tesouro Selic, CDB 100%/110% CDI, LCI/LCA, FIIs, Acoes, Personalizado
- Considera **tabela regressiva PGBL** (35% a 10%) e **IR sobre lucro** da alternativa
- Grafico de area com duas curvas (Recharts)
- Tabela ano a ano com aliquota, liquido, beneficio IR e vencedor
- Veredicto contextual: qual estrategia rende mais apos impostos

---

## Comecar

### Pre-requisitos

- Node.js 18+
- npm ou yarn

### Instalacao

```bash
git clone https://github.com/brunocastro/dome-o-leao.git
cd dome-o-leao
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Deploy na Vercel

```bash
npx vercel
```

Ou conecte o repositorio no [dashboard da Vercel](https://vercel.com/new) para deploy automatico a cada push.

---

## Como funciona

### Arquitetura

```
app/
  layout.tsx          # SEO, JSON-LD, Vercel Analytics
  page.tsx            # Renderiza <Simulador />
  globals.css         # Design system (CSS variables, responsivo)
  sitemap.ts          # Sitemap dinamico
  robots.ts           # Configuracao de crawlers

components/
  Simulador.tsx       # Componente principal (formulario + resultados)
  ComparativoInvestimentos.tsx  # Grafico + tabela de longo prazo

lib/
  calculo.ts          # INSS, IRPF, IRRF, PGBL — funcoes puras
  investimento.ts     # Projecao longo prazo, presets, tabela regressiva

public/
  llms.txt            # Documentacao para LLMs (llmstxt.org)
```

### Calculos

Toda a logica de calculo esta isolada em `lib/calculo.ts` e `lib/investimento.ts` — funcoes puras sem dependencia de UI, testáveis e reutilizaveis.

Documentacao completa das formulas, tabelas e fontes: **[CALCULO.md](./CALCULO.md)**

### Stack

| Tecnologia | Uso |
|---|---|
| [Next.js 15](https://nextjs.org) | Framework React com SSG |
| [React 19](https://react.dev) | UI components |
| [TypeScript 5.7](https://typescriptlang.org) | Type safety |
| [Recharts](https://recharts.org) | Graficos de area/linha |
| [Vercel Analytics](https://vercel.com/analytics) | Metricas de uso |
| [Vercel Speed Insights](https://vercel.com/docs/speed-insights) | Performance |
| [Husky](https://typicode.github.io/husky/) | Pre-commit hooks |
| [lint-staged](https://github.com/lint-staged/lint-staged) | Lint incremental |

### CI/CD

- **Pre-commit**: lint + typecheck via Husky + lint-staged
- **GitHub Actions**: lint, typecheck e build em PRs para main

---

## Fontes Oficiais

Todos os valores sao baseados em legislacao e fontes oficiais:

| Fonte | Referencia |
|---|---|
| Tabela IRPF 2026 | [Receita Federal — Tabelas](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026) |
| Redutor de imposto | [Lei 15.270/2025](https://www.gov.br/secom/pt-br/acompanhe-a-secom/noticias/2026/01/nova-tabela-do-ir-veja-faixas-e-aliquotas-e-saiba-mais-sobre-medida-que-isenta-o-pagamento-para-quem-ganha-ate-r-5-mil) |
| Exemplos de calculo | [Receita Federal — Exemplos](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-191-2025) |
| Tabela INSS 2026 | [Contabilizei](https://www.contabilizei.com.br/contabilidade-online/tabela-inss/) |
| Desconto simplificado | [Lei 15.270/2025](https://www.sager.adv.br/novo-limite-desconto-simplificado-irpf-2026/) |
| Tabela regressiva PGBL | [Suno](https://www.suno.com.br/artigos/tributacao-do-pgbl/) |
| Taxa Selic | [Banco Central](https://www.bcb.gov.br/controleinflacao/taxaselic) |
| Tributacao investimentos | [B3](https://borainvestir.b3.com.br/noticias/imposto-de-renda/taxacao-de-fii-lci-lca-cdb-e-outros-veja-como-ficam-os-impostos-sobre-investimentos/) |

---

## LLMs

Este projeto inclui um arquivo [`/llms.txt`](./public/llms.txt) seguindo a [especificacao llmstxt.org](https://llmstxt.org/) para facilitar o uso por modelos de linguagem e agentes de IA. O arquivo contém um resumo do projeto, conceitos-chave, links para documentacao e fontes oficiais.

---

## Contribuir

Contribuicoes sao bem-vindas! Algumas ideias:

- [ ] Testes unitarios para `lib/calculo.ts` e `lib/investimento.ts`
- [ ] Suporte a VGBL no comparativo (imposto apenas sobre rendimentos)
- [ ] Exportar resultado em PDF
- [ ] Historico de simulacoes (sem persistir dados sensiveis)
- [ ] Simulador de IRPFM (Imposto Minimo para alta renda >R$ 600k)
- [ ] i18n (ingles)

```bash
# Fork o repositorio, crie sua branch
git checkout -b feature/minha-feature

# Faca suas alteracoes e valide
npm run validate  # lint + typecheck
npm run build     # build completo

# Commit e abra um PR
```

---

## Aviso Legal

Este simulador e uma ferramenta educativa e informativa. **Nao substitui consultoria contabil ou financeira profissional.** Valores de rentabilidade sao estimativas baseadas em medias historicas e taxas vigentes. Rentabilidade passada nao garante retorno futuro. Consulte um contador para planejamento tributario definitivo.

---

## Licenca

MIT - veja [LICENSE](./LICENSE) para detalhes.

---

<p align="center">
  Feito com TypeScript, cafe e muita tabela da Receita Federal. O leao fica manso quando voce tem os numeros certos.<br/>
  <a href="https://github.com/brunocastro/dome-o-leao">github.com/brunocastro/dome-o-leao</a>
</p>
