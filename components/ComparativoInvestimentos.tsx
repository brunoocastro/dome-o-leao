'use client'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  simulaInvestimentoLongoPrazo,
  INVESTMENT_PRESETS,
  PGBL_TABELA_REGRESSIVA,
  type InvestmentParams,
  type InvestmentPreset,
} from '@/lib/investimento'
import { BRL, PCT, parseVal } from '@/lib/calculo'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ComparativoProps {
  pgblMaxAnual: number
  aporteAnualPGBL: number
  aporteMinimoPGBL: number
  aliquotaMarginalIR: number
  rendaAnual: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComparativoInvestimentos({
  pgblMaxAnual,
  aporteAnualPGBL,
  aporteMinimoPGBL,
  aliquotaMarginalIR,
  rendaAnual,
}: ComparativoProps) {
  // ── Derived: aporte comes from the calculator section above ─────────────
  const aporteMensal = aporteAnualPGBL > 0 ? aporteAnualPGBL / 12 : 0

  // ── State ────────────────────────────────────────────────────────────────
  const [horizonte, setHorizonte] = useState(15)
  const [saldoAtual, setSaldoAtual] = useState(0)
  const saldoRef = useRef<HTMLInputElement>(null)

  const handleSaldoInput = useCallback(() => {
    const el = saldoRef.current
    if (!el) return
    let v = el.value.replace(/\D/g, '')
    if (!v) { el.value = ''; setSaldoAtual(0); return }
    const num = parseInt(v, 10) / 100
    el.value = num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setSaldoAtual(num)
  }, [])

  useEffect(() => {
    const el = saldoRef.current
    if (!el) return
    el.addEventListener('input', handleSaldoInput)
    return () => el.removeEventListener('input', handleSaldoInput)
  }, [handleSaldoInput])
  const [rendPGBL, setRendPGBL] = useState(12)
  const [tipoAlt, setTipoAlt] = useState<string>('selic')
  const [rendAlt, setRendAlt] = useState(14.75)
  const [irAlt, setIrAlt] = useState(0.15)
  const [isentoAlt, setIsentoAlt] = useState(false)
  const [tabelaPGBL, setTabelaPGBL] = useState<'regressiva' | 'progressiva'>('regressiva')

  // ── Helpers ──────────────────────────────────────────────────────────────

  function handleTipoAltChange(key: string) {
    setTipoAlt(key)
    if (key !== 'personalizado') {
      const preset = INVESTMENT_PRESETS[key]
      if (preset) {
        setRendAlt(preset.taxa)
        setIrAlt(preset.irAliq)
        setIsentoAlt(preset.isento)
      }
    }
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  const projecoes = useMemo(() => {
    if (horizonte < 1 || aporteAnualPGBL < 0) return []
    return simulaInvestimentoLongoPrazo({
      aporteAnualPGBL,
      aporteMinimoPGBL,
      saldoAtualPGBL: saldoAtual,
      rendimentoPGBL: rendPGBL,
      rendimentoAlternativo: rendAlt,
      irSobreLucroAlt: isentoAlt ? 0 : irAlt,
      tabelaPGBL,
      horizonteAnos: horizonte,
      aliquotaMarginalIR,
    })
  }, [
    aporteAnualPGBL, aporteMinimoPGBL, saldoAtual, rendPGBL,
    rendAlt, irAlt, isentoAlt, tabelaPGBL,
    horizonte, aliquotaMarginalIR,
  ])

  const ultimo = projecoes.length > 0 ? projecoes[projecoes.length - 1] : null
  const vencedor = ultimo
    ? ultimo.pgblTotalReal >= ultimo.mixTotalReal ? 'pgbl' : 'mix'
    : 'pgbl'
  const diferenca = ultimo ? Math.abs(ultimo.pgblTotalReal - ultimo.mixTotalReal) : 0

  // ── Chart data ──────────────────────────────────────────────────────────

  const chartData = projecoes.map(p => ({
    ano: p.ano,
    'PGBL Teto (líquido + benefício IR)': Math.round(p.pgblTotalReal),
    'Min PGBL + Alternativo (líquido)': Math.round(p.mixTotalReal),
  }))

  // ── Table filter ────────────────────────────────────────────────────────

  const tabelaFiltrada = projecoes.filter((_, i) => {
    if (horizonte <= 15) return true
    const step = horizonte > 20 ? 5 : 2
    return (i + 1) % step === 0 || i === projecoes.length - 1 || i === 0
  })

  // ── Preset name helper ──────────────────────────────────────────────────

  const nomeAlternativo = INVESTMENT_PRESETS[tipoAlt]?.nome ?? 'Alternativo'

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="section-title">
        Comparativo de Longo Prazo — PGBL vs Investimentos Alternativos
      </div>

      {/* ── Input card ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">
          <span className="icon">📊</span> Parâmetros da Simulação
        </div>

        <div className="field-grid">
          {/* Horizonte slider */}
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>
              Horizonte de Investimento: <strong>{horizonte} anos</strong>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={horizonte}
              onChange={e => setHorizonte(+e.target.value)}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--muted)',
              }}
            >
              <span>1 ano</span>
              <span>30 anos</span>
            </div>
          </div>

          {/* Aporte — vem da calculadora acima */}
          <div className="field">
            <label>Aporte PGBL Considerado</label>
            <small>Valor definido na calculadora interativa acima</small>
            <div className="inss-computed">
              <span className="inss-val">{BRL(aporteMensal)}</span>
              <span className="inss-computed-sub">/ mês ({BRL(aporteAnualPGBL)} / ano)</span>
            </div>
          </div>

          {/* Saldo atual */}
          <div className="field">
            <label>Saldo Atual no PGBL/FAPI</label>
            <small>Valor já acumulado na previdência</small>
            <div className="input-wrap">
              <span className="prefix">R$</span>
              <input
                ref={saldoRef}
                type="text"
                className="currency"
                placeholder="0,00"
                inputMode="numeric"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Rendimento PGBL */}
          <div className="field">
            <label>Rendimento PGBL (% a.a.)</label>
            <small>Retorno anual estimado do fundo</small>
            <div className="input-wrap">
              <span className="prefix">%</span>
              <input
                type="number"
                value={rendPGBL}
                onChange={e => setRendPGBL(+e.target.value)}
                step="0.5"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Tabela PGBL */}
          <div className="field">
            <label>Tabela de Tributação PGBL</label>
            <div className="toggle-group">
              <input
                type="radio"
                id="tab-reg"
                name="tabelaPGBL"
                checked={tabelaPGBL === 'regressiva'}
                onChange={() => setTabelaPGBL('regressiva')}
              />
              <label htmlFor="tab-reg">Regressiva</label>
              <input
                type="radio"
                id="tab-prog"
                name="tabelaPGBL"
                checked={tabelaPGBL === 'progressiva'}
                onChange={() => setTabelaPGBL('progressiva')}
              />
              <label htmlFor="tab-prog">Progressiva</label>
            </div>
          </div>

          {/* Tipo investimento alternativo */}
          <div className="field">
            <label>Investimento Alternativo</label>
            <select
              value={tipoAlt}
              onChange={e => handleTipoAltChange(e.target.value)}
            >
              {Object.entries(INVESTMENT_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Rendimento alternativo */}
          <div className="field">
            <label>Rendimento Alternativo (% a.a.)</label>
            <div className="input-wrap">
              <span className="prefix">%</span>
              <input
                type="number"
                value={rendAlt}
                onChange={e => setRendAlt(+e.target.value)}
                step="0.5"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* IR alternativo - only show if not isento */}
          {!isentoAlt && (
            <div className="field">
              <label>IR sobre Ganhos (%)</label>
              <div className="input-wrap">
                <span className="prefix">%</span>
                <input
                  type="number"
                  value={(irAlt * 100).toFixed(1)}
                  onChange={e => setIrAlt(+e.target.value / 100)}
                  step="0.5"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* PGBL regressive table hint */}
        <div className="hint-box" style={{ marginTop: 14 }}>
          Tabela Regressiva PGBL: 35% (até 2 anos) → 30% (2-4) → 25% (4-6) →
          20% (6-8) → 15% (8-10) →{' '}
          <strong>10% (acima de 10 anos)</strong>
        </div>
      </div>

      {/* ── KPI Summary ───────────────────────────────────────────────────── */}
      {ultimo && (
        <div className="kpi-grid" style={{ marginTop: 16 }}>
          <div className={`kpi ${vencedor === 'pgbl' ? 'highlight' : ''}`}>
            <div className="kpi-label">PGBL Teto — Líquido Final</div>
            <div className="kpi-value">{BRL(ultimo.pgblTotalReal)}</div>
          </div>
          <div className={`kpi ${vencedor === 'mix' ? 'highlight' : ''}`}>
            <div className="kpi-label">
              Min PGBL + {nomeAlternativo} — Líquido
            </div>
            <div className="kpi-value">{BRL(ultimo.mixTotalReal)}</div>
          </div>
          <div className="kpi accent">
            <div className="kpi-label">Diferença em {horizonte} anos</div>
            <div className="kpi-value">{BRL(diferenca)}</div>
          </div>
        </div>
      )}

      {/* ── Chart ─────────────────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">
            <span className="icon">📈</span> Evolução Patrimonial — Líquido
            após Impostos
          </div>
          <div className="inv-chart-wrap">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradPGBL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ea043" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2ea043" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAlt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis
                  dataKey="ano"
                  stroke="#8b949e"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Anos',
                    position: 'insideBottomRight',
                    offset: -5,
                    style: { fill: '#8b949e', fontSize: 11 },
                  }}
                />
                <YAxis
                  stroke="#8b949e"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    `R$${(v / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: '#1c2330',
                    border: '1px solid #30363d',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#8b949e' }}
                  formatter={((value: unknown) => BRL(Number(value || 0))) as never}
                  labelFormatter={(label) => `Ano ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#8b949e' }}
                />
                <Area
                  type="monotone"
                  dataKey="PGBL Teto (líquido + benefício IR)"
                  stroke="#2ea043"
                  fill="url(#gradPGBL)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Min PGBL + Alternativo (líquido)"
                  stroke="#58a6ff"
                  fill="url(#gradAlt)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Year-by-year table ────────────────────────────────────────────── */}
      {tabelaFiltrada.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">
            <span className="icon">📋</span> Projeção Ano a Ano
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ano</th>
                  <th className="text-right">Alíq. PGBL</th>
                  <th className="text-right">PGBL Teto Liq.</th>
                  <th className="text-right">+ Benefício IR</th>
                  <th className="text-right">Total PGBL</th>
                  <th className="text-right">Mix Líquido</th>
                  <th className="text-right">Maior saldo</th>
                </tr>
              </thead>
              <tbody>
                {tabelaFiltrada.map(p => (
                  <tr
                    key={p.ano}
                    className={p.ano === horizonte ? 'highlight-row' : ''}
                  >
                    <td>{p.ano}</td>
                    <td className="text-right text-warn">
                      {PCT(p.pgblAliqResgate * 100)}
                    </td>
                    <td className="text-right">{BRL(p.pgblLiquido)}</td>
                    <td className="text-right text-green">
                      +{BRL(p.pgblBeneficioIRAcum)}
                    </td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {BRL(p.pgblTotalReal)}
                    </td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {BRL(p.mixTotalReal)}
                    </td>
                    <td className="text-right">
                      <span
                        style={{
                          color:
                            p.pgblTotalReal >= p.mixTotalReal
                              ? 'var(--primary)'
                              : 'var(--accent)',
                        }}
                      >
                        {p.pgblTotalReal >= p.mixTotalReal ? 'PGBL' : 'Mix'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Verdict ───────────────────────────────────────────────────────── */}
      {ultimo && (
        <div
          className={`verdict ${vencedor === 'pgbl' ? 'green' : 'blue'}`}
          style={{ marginTop: 16 }}
        >
          <span className="vc-icon">ℹ️</span>
          <span>
            {vencedor === 'pgbl' ? (
              <>
                Nesta simulação, em <b>{horizonte} anos</b>, o cenário{' '}
                <b>PGBL no teto</b> resulta em <b>{BRL(diferenca)}</b> a mais
                que a estratégia mista, considerando a dedução fiscal +
                rendimento. A alíquota regressiva do PGBL seria de{' '}
                {PCT(ultimo.pgblAliqResgate * 100)} neste horizonte.
                <br /><small style={{opacity: 0.7, marginTop: 4, display: 'block'}}>
                  Importante: o PGBL tributa o valor TOTAL no resgate e tem baixa liquidez. Resultados dependem de taxas de administração, rentabilidade real e cenário econômico futuro.
                </small>
              </>
            ) : (
              <>
                Nesta simulação, em <b>{horizonte} anos</b>, o cenário{' '}
                <b>
                  mínimo PGBL + {nomeAlternativo}
                </b>{' '}
                resulta em <b>{BRL(diferenca)}</b> a mais, considerando que o
                investimento alternativo
                {isentoAlt
                  ? ' é isento de IR'
                  : ` paga ${PCT(irAlt * 100)} sobre os ganhos`}
                . Em horizontes maiores (10+ anos), a alíquota regressiva do PGBL (10%) tende a tornar o cenário PGBL mais competitivo.
                <br /><small style={{opacity: 0.7, marginTop: 4, display: 'block'}}>
                  Importante: rentabilidades passadas não garantem retorno futuro. A escolha depende do seu perfil, objetivos e necessidade de liquidez.
                </small>
              </>
            )}
          </span>
        </div>
      )}
    </>
  )
}
