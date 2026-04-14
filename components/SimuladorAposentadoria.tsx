'use client'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  simularAposentadoria,
  calcularMetaAposentadoria,
  EXPECTATIVA_VIDA_BRASIL,
  IPCA_META,
  RENDA_APOSENTADORIA_DEFAULT,
  type AposentadoriaParams,
  type MetaAposentadoriaParams,
} from '@/lib/aposentadoria'
import { BRL, PCT, parseVal } from '@/lib/calculo'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AposentadoriaProps {
  pgblMaxAnual: number
  aporteAnualPGBL: number
  rendaAnual: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimuladorAposentadoria({
  pgblMaxAnual,
  aporteAnualPGBL,
  rendaAnual,
}: AposentadoriaProps) {
  // ── Mode toggle ─────────────────────────────────────────────────────────
  const [modo, setModo] = useState<'quando' | 'quanto'>('quando')

  // ── Shared inputs ───────────────────────────────────────────────────────
  const [idadeAtual, setIdadeAtual] = useState(30)
  const [idadeAposentadoria, setIdadeAposentadoria] = useState(65)
  const [idadeMaxima, setIdadeMaxima] = useState(EXPECTATIVA_VIDA_BRASIL)
  const [inflacao, setInflacao] = useState(IPCA_META)
  const [rendimento, setRendimento] = useState(12)
  const [saldoAtual, setSaldoAtual] = useState(0)
  const [tabelaPGBL, setTabelaPGBL] = useState<'regressiva' | 'progressiva'>('regressiva')

  // ── Mode 2 specific ─────────────────────────────────────────────────────
  const [rendaMensalDesejada, setRendaMensalDesejada] = useState(RENDA_APOSENTADORIA_DEFAULT)

  // ── Currency mask: saldoAtual ───────────────────────────────────────────
  const saldoRef = useRef<HTMLInputElement>(null)

  const handleSaldoInput = useCallback(() => {
    const el = saldoRef.current
    if (!el) return
    const v = el.value.replace(/\D/g, '')
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

  // ── Currency mask: rendaMensalDesejada ──────────────────────────────────
  const rendaRef = useRef<HTMLInputElement>(null)

  const handleRendaInput = useCallback(() => {
    const el = rendaRef.current
    if (!el) return
    const v = el.value.replace(/\D/g, '')
    if (!v) { el.value = ''; setRendaMensalDesejada(0); return }
    const num = parseInt(v, 10) / 100
    el.value = num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setRendaMensalDesejada(num)
  }, [])

  useEffect(() => {
    const el = rendaRef.current
    if (!el) return
    el.addEventListener('input', handleRendaInput)
    return () => el.removeEventListener('input', handleRendaInput)
  }, [handleRendaInput])

  // Seed the rendaMensalDesejada input with default value on mount
  useEffect(() => {
    const el = rendaRef.current
    if (!el || el.value) return
    const num = RENDA_APOSENTADORIA_DEFAULT
    el.value = num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }, [])

  // ── Derived: aporte from props ──────────────────────────────────────────
  const aporteMensal = aporteAnualPGBL > 0 ? aporteAnualPGBL / 12 : 0

  // ── Computed: Mode 1 ────────────────────────────────────────────────────
  const resultadoAposentadoria = useMemo(() => {
    if (modo !== 'quando' || idadeAtual >= idadeAposentadoria) return null
    return simularAposentadoria({
      idadeAtual,
      idadeAposentadoria,
      idadeMaxima,
      saldoAtualPGBL: saldoAtual,
      aporteMensalPGBL: aporteMensal,
      rendimentoAnual: rendimento,
      inflacaoAnual: inflacao,
      tabelaPGBL,
    })
  }, [modo, idadeAtual, idadeAposentadoria, idadeMaxima, saldoAtual, aporteMensal, rendimento, inflacao, tabelaPGBL])

  // ── Computed: Mode 2 ────────────────────────────────────────────────────
  const resultadoMeta = useMemo(() => {
    if (modo !== 'quanto' || idadeAtual >= idadeAposentadoria || rendaMensalDesejada <= 0) return null
    return calcularMetaAposentadoria({
      idadeAtual,
      idadeAposentadoria,
      idadeMaxima,
      rendaMensalDesejada,
      saldoAtualPGBL: saldoAtual,
      rendimentoAnual: rendimento,
      inflacaoAnual: inflacao,
      tabelaPGBL,
      rendaAnual,
    })
  }, [modo, idadeAtual, idadeAposentadoria, idadeMaxima, rendaMensalDesejada, saldoAtual, rendimento, inflacao, tabelaPGBL, rendaAnual])

  // ── Chart data: Mode 1 ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!resultadoAposentadoria) return []
    const acum = resultadoAposentadoria.projecaoAcumulacao.map(p => ({
      idade: p.idade,
      'Saldo Acumulado': Math.round(p.saldo),
      'Saldo em Retiro': null as number | null,
    }))
    const retiro = resultadoAposentadoria.projecaoRetiro.map(p => ({
      idade: p.idade,
      'Saldo Acumulado': null as number | null,
      'Saldo em Retiro': Math.round(p.saldoFim),
    }))
    return [...acum, ...retiro]
  }, [resultadoAposentadoria])

  // ── Chart data: Mode 2 ─────────────────────────────────────────────────
  const metaChartData = useMemo(() => {
    if (!resultadoMeta) return []
    return resultadoMeta.projecaoAcumulacao.map(p => ({
      idade: p.idade,
      'Saldo': Math.round(p.saldo),
      'Meta': Math.round(resultadoMeta.saldoNecessario),
    }))
  }, [resultadoMeta])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="section-title">
        Simulador de Aposentadoria com PGBL
      </div>

      {/* ── Input card ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">
          <span className="icon">&#127958;</span> Planejamento de Aposentadoria via PGBL
        </div>

        {/* Mode toggle */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Modo de Simulacao</label>
          <div className="toggle-group">
            <input
              type="radio"
              id="modo-quando"
              name="modoAposentadoria"
              checked={modo === 'quando'}
              onChange={() => setModo('quando')}
            />
            <label htmlFor="modo-quando">Quando me aposentar</label>
            <input
              type="radio"
              id="modo-quanto"
              name="modoAposentadoria"
              checked={modo === 'quanto'}
              onChange={() => setModo('quanto')}
            />
            <label htmlFor="modo-quanto">Quanto preciso</label>
          </div>
        </div>

        {/* Shared inputs */}
        <div className="field-grid">
          {/* Idade atual */}
          <div className="field">
            <label>Idade Atual: <strong>{idadeAtual} anos</strong></label>
            <input
              type="range"
              min={18}
              max={70}
              value={idadeAtual}
              onChange={e => setIdadeAtual(+e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <span>18</span><span>70</span>
            </div>
          </div>

          {/* Idade aposentadoria */}
          <div className="field">
            <label>Idade de Aposentadoria: <strong>{idadeAposentadoria} anos</strong></label>
            <input
              type="range"
              min={Math.max(idadeAtual + 1, 40)}
              max={80}
              value={idadeAposentadoria}
              onChange={e => setIdadeAposentadoria(+e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <span>{Math.max(idadeAtual + 1, 40)}</span><span>80</span>
            </div>
          </div>

          {/* Expectativa de vida */}
          <div className="field">
            <label>Expectativa de Vida: <strong>{idadeMaxima} anos</strong></label>
            <small>Media brasileira: {EXPECTATIVA_VIDA_BRASIL} anos (IBGE 2024)</small>
            <input
              type="range"
              min={idadeAposentadoria + 1}
              max={100}
              value={idadeMaxima}
              onChange={e => setIdadeMaxima(+e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
              <span>{idadeAposentadoria + 1}</span><span>100</span>
            </div>
          </div>

          {/* Inflacao */}
          <div className="field">
            <label>Inflacao Estimada (% a.a.)</label>
            <small>Meta IPCA: {IPCA_META}% (BCB)</small>
            <div className="input-wrap">
              <span className="prefix">%</span>
              <input
                type="number"
                value={inflacao}
                onChange={e => setInflacao(+e.target.value)}
                step="0.5"
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
                value={rendimento}
                onChange={e => setRendimento(+e.target.value)}
                step="0.5"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Tabela PGBL */}
          <div className="field">
            <label>Tabela de Tributacao</label>
            <div className="toggle-group">
              <input
                type="radio"
                id="apo-reg"
                name="tabelaAposentadoria"
                checked={tabelaPGBL === 'regressiva'}
                onChange={() => setTabelaPGBL('regressiva')}
              />
              <label htmlFor="apo-reg">Regressiva</label>
              <input
                type="radio"
                id="apo-prog"
                name="tabelaAposentadoria"
                checked={tabelaPGBL === 'progressiva'}
                onChange={() => setTabelaPGBL('progressiva')}
              />
              <label htmlFor="apo-prog">Progressiva</label>
            </div>
          </div>

          {/* Saldo atual */}
          <div className="field">
            <label>Saldo Atual no PGBL</label>
            <small>Valor ja acumulado na previdencia</small>
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

          {/* Aporte PGBL — display only */}
          <div className="field">
            <label>Aporte Mensal PGBL</label>
            <small>Valor da calculadora interativa</small>
            <div className="inss-computed">
              <span className="inss-val">{BRL(aporteMensal)}</span>
              <span className="inss-computed-sub">/ mes ({BRL(aporteAnualPGBL)} / ano)</span>
            </div>
          </div>

          {/* Mode 2 only: Renda desejada */}
          {modo === 'quanto' && (
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Renda Mensal Desejada na Aposentadoria (em valores de hoje)</label>
              <small>Valor liquido que deseja receber por mes, em poder de compra atual</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input
                  ref={rendaRef}
                  type="text"
                  className="currency"
                  placeholder="5.000,00"
                  inputMode="numeric"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODE 1: Results ═══ */}
      {modo === 'quando' && resultadoAposentadoria && (
        <>
          {/* KPIs */}
          <div className="kpi-grid" style={{ marginTop: 16 }}>
            <div className="kpi accent">
              <div className="kpi-label">Saldo Acumulado</div>
              <div className="kpi-value">{BRL(resultadoAposentadoria.saldoAcumulado)}</div>
            </div>
            <div className="kpi highlight">
              <div className="kpi-label">Retirada Mensal Bruta</div>
              <div className="kpi-value">{BRL(resultadoAposentadoria.retiradaMensalBruta)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Retirada Liquida (apos IR)</div>
              <div className="kpi-value">{BRL(resultadoAposentadoria.retiradaMensalLiquida)}</div>
            </div>
            <div className="kpi warn">
              <div className="kpi-label">Poder de Compra Real</div>
              <div className="kpi-value">{BRL(resultadoAposentadoria.retiradaRealMensal)}</div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">
                <span className="icon">&#128200;</span> Evolucao do Patrimonio
              </div>
              <div className="inv-chart-wrap">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2ea043" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2ea043" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradRetiro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d29922" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#d29922" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis
                      dataKey="idade"
                      stroke="#8b949e"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: 'Idade',
                        position: 'insideBottomRight',
                        offset: -5,
                        style: { fill: '#8b949e', fontSize: 11 },
                      }}
                    />
                    <YAxis
                      stroke="#8b949e"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        v >= 1_000_000
                          ? `R$${(v / 1_000_000).toFixed(1)}M`
                          : `R$${(v / 1000).toFixed(0)}k`
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
                      labelFormatter={(label) => `Idade ${label}`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#8b949e' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Saldo Acumulado"
                      stroke="#2ea043"
                      fill="url(#gradAcum)"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="Saldo em Retiro"
                      stroke="#d29922"
                      fill="url(#gradRetiro)"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Summary hint box */}
          <div className="hint-box" style={{ marginTop: 12 }}>
            Em <b>{resultadoAposentadoria.anosAcumulacao} anos</b> de acumulacao
            ({idadeAtual} &#8594; {idadeAposentadoria} anos),
            com aporte de <b>{BRL(aporteMensal)}/mes</b>,
            voce acumularia <b>{BRL(resultadoAposentadoria.saldoAcumulado)}</b>.
            A retirada seria de <b>{BRL(resultadoAposentadoria.retiradaMensalLiquida)}/mes</b> liquidos
            durante <b>{resultadoAposentadoria.anosRetiro} anos</b> ({idadeAposentadoria} &#8594; {idadeMaxima} anos).
            Em valores de hoje, isso equivale a <b>{BRL(resultadoAposentadoria.retiradaRealMensal)}/mes</b> de poder de compra.
          </div>
        </>
      )}

      {/* ═══ MODE 2: Results ═══ */}
      {modo === 'quanto' && resultadoMeta && (
        <>
          {/* KPIs */}
          <div className="kpi-grid" style={{ marginTop: 16 }}>
            <div className="kpi accent">
              <div className="kpi-label">Saldo Necessario</div>
              <div className="kpi-value">{BRL(resultadoMeta.saldoNecessario)}</div>
            </div>
            <div className="kpi highlight">
              <div className="kpi-label">Aporte Mensal Necessario</div>
              <div className="kpi-value">{BRL(resultadoMeta.aporteMensalNecessario)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">% da Renda Atual</div>
              <div className="kpi-value">{PCT(resultadoMeta.percentualRenda)}</div>
            </div>
            <div className={`kpi ${resultadoMeta.dentroDoTeto12 ? 'highlight' : 'warn'}`}>
              <div className="kpi-label">Dentro do Teto 12%?</div>
              <div className="kpi-value">{resultadoMeta.dentroDoTeto12 ? 'Sim' : 'Nao'}</div>
            </div>
          </div>

          {/* If exceeds 12% */}
          {!resultadoMeta.dentroDoTeto12 && (
            <div className="verdict warn" style={{ marginTop: 12 }}>
              <span className="vc-icon">&#9888;&#65039;</span>
              <span>
                O aporte necessario ({BRL(resultadoMeta.aporteAnualNecessario)}/ano)
                excede o teto dedutivel do PGBL ({BRL(pgblMaxAnual)}/ano).
                O excedente de <b>{BRL(resultadoMeta.gap)}/ano</b> precisaria
                ser investido em outros veiculos (VGBL, Tesouro Direto, etc.)
                sem o beneficio da deducao fiscal.
              </span>
            </div>
          )}

          {/* Chart */}
          {metaChartData.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">
                <span className="icon">&#128200;</span> Trajetoria de Acumulacao
              </div>
              <div className="inv-chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={metaChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2ea043" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2ea043" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis
                      dataKey="idade"
                      stroke="#8b949e"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: 'Idade',
                        position: 'insideBottomRight',
                        offset: -5,
                        style: { fill: '#8b949e', fontSize: 11 },
                      }}
                    />
                    <YAxis
                      stroke="#8b949e"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        v >= 1_000_000
                          ? `R$${(v / 1_000_000).toFixed(1)}M`
                          : `R$${(v / 1000).toFixed(0)}k`
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
                      labelFormatter={(label) => `Idade ${label}`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#8b949e' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Saldo"
                      stroke="#2ea043"
                      fill="url(#gradMeta)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Meta"
                      stroke="#58a6ff"
                      fill="none"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Summary hint box */}
          <div className="hint-box" style={{ marginTop: 12 }}>
            Para receber <b>{BRL(rendaMensalDesejada)}/mes</b> liquidos
            (em valores de hoje) dos {idadeAposentadoria} aos {idadeMaxima} anos,
            seria necessario acumular <b>{BRL(resultadoMeta.saldoNecessario)}</b> no PGBL,
            o que exige aportes de <b>{BRL(resultadoMeta.aporteMensalNecessario)}/mes</b> durante {resultadoMeta.anosAcumulacao} anos.
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="notice" style={{ marginTop: 16, borderLeftColor: 'var(--danger)' }}>
        <b>&#9888; Simulacao educativa.</b> Os valores sao projecoes matematicas baseadas nas taxas informadas.
        Rentabilidade passada nao garante retorno futuro. A inflacao real pode diferir da meta.
        Consulte um planejador financeiro certificado (CFP) para definir sua estrategia de aposentadoria.
      </div>
    </>
  )
}
