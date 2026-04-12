import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Dome o Leao — Simulador IRPF 2026 | Pague o Minimo, Receba o Maximo',
  description:
    'Dome o Leao do Imposto de Renda! Simulador gratuito IRPF 2026 com calculo de INSS, IRRF, restituicao, estrategia PGBL/FAPI e comparativo de longo prazo entre PGBL vs Selic, CDB, LCI, FIIs e acoes — tudo apos impostos. Valores oficiais Lei 15.191/2025 e Lei 15.270/2025.',
  keywords: [
    'dome o leao',
    'IRPF 2026',
    'simulador imposto de renda',
    'PGBL',
    'FAPI',
    'restituicao',
    'declaracao imposto de renda',
    'calculadora IRPF',
    'aliquota efetiva',
    'INSS 2026',
    'PGBL vs Selic',
    'comparativo investimentos',
    'leao imposto de renda',
  ],
  openGraph: {
    title: 'Dome o Leao — Simulador IRPF 2026 | Pague o Minimo, Receba o Maximo',
    description:
      'Dome o Leao! Simulador IRPF 2026 com estrategia PGBL/FAPI e comparativo de longo prazo entre PGBL vs Selic, CDB, LCI, FIIs — tudo apos impostos.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Dome o Leao',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dome o Leao — Dome o Leao do Imposto de Renda 2026',
    description: 'Pague o minimo, receba o maximo. Simulador IRPF 2026 com comparativo PGBL vs investimentos.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Dome o Leao — Simulador IRPF 2026',
  alternateName: 'Dome o Leao',
  description:
    'Simulador gratuito de Imposto de Renda 2026 com calculo de INSS, IRRF, restituicao, estrategia PGBL/FAPI e comparativo de longo prazo entre PGBL vs investimentos alternativos.',
  url: 'https://domeoleao.com.br',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
