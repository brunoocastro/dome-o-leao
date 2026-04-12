import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import CopyLlmsTxt from '@/components/CopyLlmsTxt'

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
        <footer className="site-footer">
          <div className="footer-links">
            <a href="https://github.com/brunoocastro/dome-o-leao" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <span>Open Source</span>
            </a>
            <a href="https://www.linkedin.com/in/brunoocastro/" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              <span>Bruno Castro</span>
            </a>
            <a href="https://buymeacoffee.com/brunocastro" target="_blank" rel="noopener noreferrer" className="footer-coffee">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.502.451-.399.801.064.217.2.391.374.516.255.183.564.279.862.36.434.118.882.194 1.33.27.45.074.904.126 1.358.17a37.6 37.6 0 004.28-.004c.56-.048 1.118-.112 1.672-.199l.138-.025c.298-.052.578-.113.862-.178l.029-.007c.385-.09.735.238.627.625l-.404 1.886a.62.62 0 01-.606.484H7.577a.62.62 0 01-.606-.484l-1.04-4.867a.728.728 0 00-.707-.579H2.875a.621.621 0 00-.613.71l1.367 6.406a3.71 3.71 0 003.627 2.936h8.488a3.71 3.71 0 003.627-2.936l.86-4.031a.617.617 0 00-.092-.466 7.704 7.704 0 00-.267-.39c.01-.047.021-.093.028-.14l.404-1.886a2.372 2.372 0 00-.443-1.984z"/></svg>
              <span>Buy me a coffee</span>
            </a>
          </div>
          <CopyLlmsTxt />
          <p className="footer-tagline">Feito com TypeScript, IA, café e muita tabela da Receita Federal.</p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
