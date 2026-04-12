<p align="center">
  <img src="https://img.shields.io/badge/ano--calend%C3%A1rio-2026-2ea043?style=for-the-badge" alt="Ano-Calendário 2026" />
  <img src="https://img.shields.io/badge/Next.js-15-000?style=for-the-badge&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vercel-Deploy-000?style=for-the-badge&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/licen%C3%A7a-MIT-blue?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">Dome o Leão<br/><sub>Simulador IRPF 2026 — Pague o Mínimo, Receba o Máximo</sub></h1>

<p align="center">
  <strong>O leão do Imposto de Renda só ruge pra quem não tem os números certos. Descubra quanto pagar, quanto receber e onde investir pra ele ficar mansinho.</strong>
</p>

<p align="center">
  <a href="#-o-que-faz">O que faz</a> ·
  <a href="#-por-que-este-é-diferente">Por que é diferente</a> ·
  <a href="#-funcionalidades">Funcionalidades</a> ·
  <a href="#-começar">Começar</a> ·
  <a href="#-como-funciona">Como funciona</a> ·
  <a href="#-fontes-oficiais">Fontes</a> ·
  <a href="#-contribuir">Contribuir</a>
</p>

---

## O que faz

Um simulador completo de Imposto de Renda Pessoa Física para o ano-calendário 2026 que vai além do cálculo básico: além de mostrar quanto você deve ou vai restituir, ele responde a pergunta que nenhum outro simulador responde:

> **"Depois de todos os impostos, vale mais a pena colocar o teto no PGBL ou investir o mínimo e aplicar o resto na Selic, CDB, LCI, FIIs ou ações?"**

---

## Por que este é diferente

A maioria dos simuladores de IRPF para no cálculo do imposto. Alguns recomendam o PGBL. Mas **nenhum** mostra o que acontece **depois** — quando você resgata o PGBL e paga 10-35% sobre o valor total, enquanto na Selic você pagaria 15% apenas sobre o lucro.

| Funcionalidade | Receita Federal | Simuladores comuns | **Este simulador** |
|---|:---:|:---:|:---:|
| Cálculo IRPF com tabela 2026 | Sim | Sim | Sim |
| Redutor de imposto (Lei 15.270/2025) | Sim | Alguns | Sim |
| IRRF e resultado (restituição/pagar) | Sim | Raro | Sim |
| Comparativo Completo vs Simplificado | Sim | Sim | Sim |
| Estratégia PGBL — aporte ideal | - | Alguns | Sim |
| Aporte mínimo para não "perder dinheiro" | - | - | **Sim** |
| Calculadora interativa de aportes | - | - | **Sim** |
| Projeção longo prazo (1-30 anos) | - | - | **Sim** |
| PGBL vs Selic/CDB/LCI/FIIs/Ações | - | - | **Sim** |
| Considera imposto no resgate PGBL | - | - | **Sim** |
| Considera imposto no lucro da alternativa | - | - | **Sim** |
| Reinvestimento do benefício fiscal | - | - | **Sim** |
| Gráfico de evolução patrimonial | - | - | **Sim** |
| Tabela regressiva vs progressiva PGBL | - | - | **Sim** |
| Open source e gratuito | - | Parcial | **Sim** |

---

## Funcionalidades

### Etapa 1 — Coleta de Dados
- Salário bruto mensal ou renda anual
- Outras fontes de renda tributável
- INSS automático (tabela progressiva) ou manual, com tooltip detalhado por faixa
- IRRF automático ou manual (para validar contra o Informe de Rendimentos)
- Dependentes, despesas médicas, educação, pensão alimentícia
- Previdência complementar (PGBL/VGBL) com aportes mensais e esporádicos

### Etapa 2 — Cálculo do Imposto
- Tabela progressiva IRPF 2026 com redutor (Lei 15.270/2025)
- Comparativo automático: **Deduções Legais vs Desconto Simplificado**
- Imposto apurado, IRRF pago, e **resultado final** (restituição ou a pagar)
- Alíquota efetiva com barra visual

### Etapa 3 — Estratégia PGBL/FAPI
- Aporte ideal (teto 12%) com economia de IR em reais
- **Aporte mínimo** para resultado zero (não pagar IR "a toa")
- Gráfico de barras comparando cenários (0%, 25%, 50%, 75%, 100% do teto)
- Calculadora interativa com slider + campos editáveis

### Etapa 4 — Comparativo de Longo Prazo
- Projeção de 1 a 30 anos
- **PGBL no teto** (com benefício fiscal reinvestido) vs **PGBL mínimo + investimento alternativo**
- 7 tipos de investimento: Tesouro Selic, CDB 100%/110% CDI, LCI/LCA, FIIs, Ações, Personalizado
- Considera **tabela regressiva PGBL** (35% a 10%) e **IR sobre lucro** da alternativa
- Gráfico de área com duas curvas (Recharts)
- Tabela ano a ano com alíquota, líquido, benefício IR e vencedor
- Veredicto contextual: qual estratégia rende mais após impostos

---

## Começar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
git clone https://github.com/brunoocastro/dome-o-leao.git
cd dome-o-leao
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Deploy na Vercel

```bash
npx vercel
```

Ou conecte o repositório no [dashboard da Vercel](https://vercel.com/new) para deploy automático a cada push.

---

## Como funciona

### Arquitetura

```
app/
  layout.tsx          # SEO, JSON-LD, Vercel Analytics
  page.tsx            # Renderiza <Simulador />
  globals.css         # Design system (CSS variables, responsivo)
  sitemap.ts          # Sitemap dinâmico
  robots.ts           # Configuração de crawlers

components/
  Simulador.tsx       # Componente principal (formulário + resultados)
  ComparativoInvestimentos.tsx  # Gráfico + tabela de longo prazo

lib/
  calculo.ts          # INSS, IRPF, IRRF, PGBL — funções puras
  investimento.ts     # Projeção longo prazo, presets, tabela regressiva

public/
  llms.txt            # Documentação para LLMs (llmstxt.org)
```

### Cálculos

Toda a lógica de cálculo está isolada em `lib/calculo.ts` e `lib/investimento.ts` — funções puras sem dependência de UI, testáveis e reutilizáveis.

Documentação completa das fórmulas, tabelas e fontes: **[CALCULO.md](./CALCULO.md)**

### Stack

| Tecnologia | Uso |
|---|---|
| [Next.js 15](https://nextjs.org) | Framework React com SSG |
| [React 19](https://react.dev) | UI components |
| [TypeScript 5.7](https://typescriptlang.org) | Type safety |
| [Recharts](https://recharts.org) | Gráficos de área/linha |
| [Vercel Analytics](https://vercel.com/analytics) | Métricas de uso |
| [Vercel Speed Insights](https://vercel.com/docs/speed-insights) | Performance |
| [Husky](https://typicode.github.io/husky/) | Pre-commit hooks |
| [lint-staged](https://github.com/lint-staged/lint-staged) | Lint incremental |

### CI/CD

- **Pre-commit**: lint + typecheck via Husky + lint-staged
- **GitHub Actions**: lint, typecheck e build em PRs para main

---

## Fontes Oficiais

Todos os valores são baseados em legislação e fontes oficiais:

| Fonte | Referência |
|---|---|
| Tabela IRPF 2026 | [Receita Federal — Tabelas](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026) |
| Redutor de imposto | [Lei 15.270/2025](https://www.gov.br/secom/pt-br/acompanhe-a-secom/noticias/2026/01/nova-tabela-do-ir-veja-faixas-e-aliquotas-e-saiba-mais-sobre-medida-que-isenta-o-pagamento-para-quem-ganha-ate-r-5-mil) |
| Exemplos de cálculo | [Receita Federal — Exemplos](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-191-2025) |
| Tabela INSS 2026 | [Contabilizei](https://www.contabilizei.com.br/contabilidade-online/tabela-inss/) |
| Desconto simplificado | [Lei 15.270/2025](https://www.sager.adv.br/novo-limite-desconto-simplificado-irpf-2026/) |
| Tabela regressiva PGBL | [Suno](https://www.suno.com.br/artigos/tributacao-do-pgbl/) |
| Taxa Selic | [Banco Central](https://www.bcb.gov.br/controleinflacao/taxaselic) |
| Tributação investimentos | [B3](https://borainvestir.b3.com.br/noticias/imposto-de-renda/taxacao-de-fii-lci-lca-cdb-e-outros-veja-como-ficam-os-impostos-sobre-investimentos/) |

---

## LLMs

Este projeto inclui um arquivo [`/llms.txt`](./public/llms.txt) seguindo a [especificação llmstxt.org](https://llmstxt.org/) para facilitar o uso por modelos de linguagem e agentes de IA. O arquivo contém um resumo do projeto, conceitos-chave, links para documentação e fontes oficiais.

---

## Contribuir

Contribuições são bem-vindas! Algumas ideias para melhorias:

- [ ] Suporte completo a VGBL no comparativo de investimentos (imposto apenas sobre rendimentos no resgate)
- [ ] Exportar resultado completo em PDF com todas as tabelas e gráficos
- [ ] Simulador de IRPFM (Imposto Mínimo sobre alta renda >R$ 600k/ano — Lei da Reforma Tributária)
- [ ] Modo escuro/claro (toggle de tema)
- [ ] Simulação de múltiplos cenários lado a lado (ex: solteiro vs casado com dependentes)
- [ ] Integração com Informe de Rendimentos via upload de PDF
- [ ] Suporte a rendimentos de exterior e criptomoedas
- [ ] Gráfico de pizza com distribuição das deduções
- [ ] PWA offline completo (service worker para uso sem internet)
- [ ] i18n (inglês e espanhol)

```bash
# Fork o repositório, crie sua branch
git checkout -b feature/minha-feature

# Faça suas alterações e valide
npm run validate  # lint + typecheck
npm run build     # build completo

# Commit e abra um PR
```

---

## Aviso Legal

Este simulador é uma ferramenta educativa e informativa. **Não substitui consultoria contábil ou financeira profissional.** Valores de rentabilidade são estimativas baseadas em médias históricas e taxas vigentes. Rentabilidade passada não garante retorno futuro. Consulte um contador para planejamento tributário definitivo.

---

## Licença

MIT - veja [LICENSE](./LICENSE) para detalhes.

---

<p align="center">
  Feito com TypeScript, café e muita tabela da Receita Federal. O leão fica manso quando você tem os números certos.<br/>
  <a href="https://github.com/brunoocastro/dome-o-leao">github.com/brunoocastro/dome-o-leao</a>
</p>
