'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import {
  BRL, PCT, parseVal,
  calcINSS, calcINSSDetalhado, calcIRPF, calcIRRFMensal,
  simulaPGBL, findAporteMinimo,
  DESC_SIMPLIFICADO_TETO, INSS_TETO_MENSAL,
  type SimState, type SimResult,
} from '@/lib/calculo'
import dynamic from 'next/dynamic'

const ComparativoInvestimentos = dynamic(
  () => import('@/components/ComparativoInvestimentos'),
  { ssr: false }
)

interface SporadicEntry {
  month: string
  value: number
}

export default function Simulador() {
  const [showResults, setShowResults] = useState(false)
  const [sporadicEntries, setSporadicEntries] = useState<SporadicEntry[]>([])

  // Ref to hold simulation state for the interactive calculator
  const simStateRef = useRef<SimState | null>(null)

  // State for investment comparison props
  const [compProps, setCompProps] = useState<{
    pgblMaxAnual: number
    aporteMinimoPGBL: number
    aliquotaMarginalIR: number
    rendaAnual: number
  } | null>(null)

  // ── Currency mask ──────────────────────────────────────────────────────────
  const maskCurrency = useCallback((el: HTMLInputElement | null) => {
    if (!el) return
    const handler = () => {
      let v = el.value.replace(/\D/g, '')
      if (!v) { el.value = ''; return }
      v = (parseInt(v, 10) / 100).toFixed(2)
      el.value = v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
    el.addEventListener('input', handler)
  }, [])

  // ── Initialize masks on mount ──────────────────────────────────────────────
  useEffect(() => {
    document.querySelectorAll<HTMLInputElement>('input.currency').forEach(maskCurrency)
  }, [maskCurrency])

  // ── Step indicator ─────────────────────────────────────────────────────────
  const setStep = useCallback((n: number) => {
    ;[1, 2, 3].forEach(i => {
      const el = document.getElementById('step-nav-' + i)
      if (!el) return
      el.classList.remove('active', 'done')
      if (i < n) el.classList.add('done')
      if (i === n) el.classList.add('active')
    })
  }, [])

  // ── INSS preview ───────────────────────────────────────────────────────────
  const updateINSSPreview = useCallback(() => {
    const isManual = (document.getElementById('inss-manual') as HTMLInputElement)?.checked
    if (isManual) return
    const inputType = (document.querySelector('input[name="inputType"]:checked') as HTMLInputElement)?.value
    const rendaRaw = parseVal((document.getElementById('rendaPrincipal') as HTMLInputElement)?.value || '')

    const salBase = inputType === 'anual' ? rendaRaw / 12 : rendaRaw
    const detalhe = calcINSSDetalhado(salBase)
    const inssMensal = detalhe.total

    const valEl = document.getElementById('inssComputedVal')
    const anualEl = document.getElementById('inssComputedAnual')
    if (valEl) valEl.textContent = BRL(inssMensal)
    if (anualEl) anualEl.textContent = 'Anual: ' + BRL(inssMensal * 12)

    // Tooltip
    const tbody = document.getElementById('inssTooltipBody')
    if (!tbody) return
    if (detalhe.faixas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Informe o salario</td></tr>'
      return
    }
    const BRL2 = (v: number) => v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    tbody.innerHTML = detalhe.faixas.map(f =>
      `<tr>
        <td>${BRL2(f.de)} a ${BRL2(f.ate)}</td>
        <td class="tt-aliq">${(f.aliq * 100).toFixed(1)}%</td>
        <td>${BRL2(f.base)}</td>
        <td>${BRL2(f.contrib)}</td>
      </tr>`
    ).join('') +
      `<tr class="tt-total">
        <td colspan="2">Total INSS</td>
        <td></td>
        <td>${BRL2(detalhe.total)}</td>
      </tr>`
  }, [])

  // ── IRRF preview ───────────────────────────────────────────────────────────
  const updateIRRFPreview = useCallback(() => {
    const isManual = (document.getElementById('irrf-manual') as HTMLInputElement)?.checked
    if (isManual) return
    const inputType = (document.querySelector('input[name="inputType"]:checked') as HTMLInputElement)?.value
    const rendaRaw = parseVal((document.getElementById('rendaPrincipal') as HTMLInputElement)?.value || '')
    const salBase = inputType === 'anual' ? rendaRaw / 12 : rendaRaw

    const irrfMensal = calcIRRFMensal(salBase)
    const valEl = document.getElementById('irrfComputedVal')
    const anualEl = document.getElementById('irrfComputedAnual')
    if (valEl) valEl.textContent = BRL(irrfMensal)
    if (anualEl) anualEl.textContent = 'Anual: ' + BRL(irrfMensal * 12)
  }, [])

  const updateAllPreviews = useCallback(() => {
    updateINSSPreview()
    updateIRRFPreview()
  }, [updateINSSPreview, updateIRRFPreview])

  // ── INSS visibility toggle ─────────────────────────────────────────────────
  const updateINSSVisibility = useCallback(() => {
    const isManual = (document.getElementById('inss-manual') as HTMLInputElement)?.checked
    const inssField = document.getElementById('inssField')
    const inssAutoPreview = document.getElementById('inssAutoPreview')
    if (inssField) inssField.style.display = isManual ? 'flex' : 'none'
    if (inssAutoPreview) inssAutoPreview.style.display = isManual ? 'none' : 'flex'
    if (!isManual) updateINSSPreview()
  }, [updateINSSPreview])

  // ── IRRF visibility toggle ─────────────────────────────────────────────────
  const updateIRRFVisibility = useCallback(() => {
    const isManual = (document.getElementById('irrf-manual') as HTMLInputElement)?.checked
    const irrfManualField = document.getElementById('irrfManualField')
    const irrfAutoPreview = document.getElementById('irrfAutoPreview')
    if (irrfManualField) irrfManualField.style.display = isManual ? 'flex' : 'none'
    if (irrfAutoPreview) irrfAutoPreview.style.display = isManual ? 'none' : 'flex'
    if (!isManual) updateIRRFPreview()
  }, [updateIRRFPreview])

  // ── Attach event listeners on mount ────────────────────────────────────────
  useEffect(() => {
    const rendaPrincipal = document.getElementById('rendaPrincipal')
    const vinculo = document.getElementById('vinculo')

    rendaPrincipal?.addEventListener('input', updateAllPreviews)
    vinculo?.addEventListener('change', updateAllPreviews)

    document.querySelectorAll<HTMLInputElement>('input[name="inputType"]').forEach(r => {
      r.addEventListener('change', updateAllPreviews)
      r.addEventListener('change', () => {
        const label = document.getElementById('rendaLabel')
        if (label) {
          label.textContent = (document.getElementById('t-anual') as HTMLInputElement)?.checked
            ? 'Renda Tributavel Anual'
            : 'Salario Bruto Mensal'
        }
      })
    })

    document.querySelectorAll<HTMLInputElement>('input[name="inssMode"]').forEach(r => {
      r.addEventListener('change', updateINSSVisibility)
    })

    document.querySelectorAll<HTMLInputElement>('input[name="irrfMode"]').forEach(r => {
      r.addEventListener('change', updateIRRFVisibility)
    })

    document.querySelectorAll<HTMLInputElement>('input[name="prevType"]').forEach(r => {
      r.addEventListener('change', () => {
        const v = (document.querySelector('input[name="prevType"]:checked') as HTMLInputElement)?.value
        const prevValorField = document.getElementById('prevValorField')
        const sporadicSection = document.getElementById('sporadicSection')
        const prevHint = document.getElementById('prevHint')
        if (prevValorField) prevValorField.style.display = v !== 'nao' ? 'flex' : 'none'
        if (sporadicSection) sporadicSection.style.display = v !== 'nao' ? 'block' : 'none'
        if (prevHint) prevHint.textContent = v === 'vgbl'
          ? 'VGBL nao e dedutivel do IRPF. Considere migrar para PGBL para aproveitar os 12% de deducao.'
          : 'O PGBL permite deduzir ate 12% da renda bruta tributavel anual.'
      })
    })

    return () => {
      rendaPrincipal?.removeEventListener('input', updateAllPreviews)
      vinculo?.removeEventListener('change', updateAllPreviews)
    }
  }, [updateAllPreviews, updateINSSVisibility, updateIRRFVisibility])

  // ── Sporadic entries ───────────────────────────────────────────────────────
  const getSporadicTotal = useCallback(() => {
    return sporadicEntries.reduce((s, e) => s + e.value, 0)
  }, [sporadicEntries])

  const renderSporadics = useCallback((entries: SporadicEntry[]) => {
    const list = document.getElementById('sporadicList')
    const totalEl = document.getElementById('sporadicTotal')
    const totalValEl = document.getElementById('sporadicTotalVal')

    if (entries.length === 0) {
      if (list) list.innerHTML = ''
      if (totalEl) totalEl.style.display = 'none'
      return
    }

    if (list) {
      list.innerHTML = entries.map((e, i) =>
        `<div class="sporadic-entry">
          <span class="se-month">${e.month}</span>
          <span class="se-value">${BRL(e.value)}</span>
          <button class="se-remove" data-idx="${i}" title="Remover">&times;</button>
        </div>`
      ).join('')

      // Attach remove handlers
      list.querySelectorAll<HTMLButtonElement>('.se-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx || '0', 10)
          setSporadicEntries(prev => {
            const next = [...prev]
            next.splice(idx, 1)
            return next
          })
        })
      })
    }

    const total = entries.reduce((s, e) => s + e.value, 0)
    if (totalValEl) totalValEl.textContent = BRL(total)
    if (totalEl) totalEl.style.display = 'flex'
  }, [])

  // Re-render sporadic list when entries change
  useEffect(() => {
    renderSporadics(sporadicEntries)
  }, [sporadicEntries, renderSporadics])

  const addSporadic = useCallback(() => {
    const monthEl = document.getElementById('sporadicMonth') as HTMLSelectElement
    const valEl = document.getElementById('sporadicValue') as HTMLInputElement
    if (!monthEl || !valEl) return
    const month = monthEl.value
    const value = parseVal(valEl.value)
    if (value <= 0) return
    setSporadicEntries(prev => [...prev, { month, value }])
    valEl.value = ''
  }, [])

  // ── Render report ──────────────────────────────────────────────────────────
  const renderReport = useCallback((st: SimState) => {
    // Cenarios a simular
    const cenarios: Array<{ label: string; tag: string } & SimResult> = []
    cenarios.push({ label: 'Sem PGBL', tag: '', ...simulaPGBL(st, 0) })
    if (st.prevAnualAtual > 0) {
      cenarios.push({ label: 'Aporte Atual', tag: 'atual', ...simulaPGBL(st, st.prevAnualAtual) })
    }
    ;[0.25, 0.50, 0.75].forEach(p => {
      const v = Math.round(st.pgblMaxAnual * p)
      cenarios.push({ label: `${Math.round(p * 100)}% do teto`, tag: '', ...simulaPGBL(st, v) })
    })
    cenarios.push({ label: 'Teto 12%', tag: 'ideal', ...simulaPGBL(st, st.pgblMaxAnual) })

    // Aporte minimo
    const minInfo = findAporteMinimo(st)

    if (minInfo.aporte > 0 && Math.abs(minInfo.aporte - st.pgblMaxAnual) > 100) {
      const minCenario = { label: 'Aporte Minimo', tag: 'min', ...simulaPGBL(st, minInfo.aporte) }
      let inserted = false
      for (let i = 0; i < cenarios.length; i++) {
        if (cenarios[i].pgblAnual > minInfo.aporte) {
          cenarios.splice(i, 0, minCenario)
          inserted = true
          break
        }
      }
      if (!inserted) cenarios.push(minCenario)
    }

    const teto = simulaPGBL(st, st.pgblMaxAnual)
    const semPgbl = simulaPGBL(st, 0)
    const economiaIdeal = semPgbl.impostoFinal - teto.impostoFinal

    // Relatorio ideal
    const idealMensal = st.pgblMaxAnual / 12
    const reportIdealContent = document.getElementById('report-ideal-content')
    if (reportIdealContent) {
      reportIdealContent.innerHTML = `
    <div class="report-grid">
      <div class="report-item featured">
        <div class="ri-label">Aporte Ideal (teto 12%)</div>
        <div class="ri-value text-green">${BRL(st.pgblMaxAnual)}<span style="font-size:13px;color:var(--muted)">/ano</span></div>
        <div class="ri-sub">${BRL(idealMensal)}/mes</div>
      </div>
      <div class="report-item featured">
        <div class="ri-label">Resultado com Aporte Ideal</div>
        <div class="ri-value ${teto.resultFinal < 0 ? 'text-green' : 'text-red'}">${teto.resultFinal < 0 ? '(Restituir) ' : '(A pagar) '}${BRL(Math.abs(teto.resultFinal))}</div>
        <div class="ri-sub">Imposto apurado: ${BRL(teto.impostoFinal)}</div>
      </div>
      <div class="report-item">
        <div class="ri-label">Resultado Atual (sem aporte ideal)</div>
        <div class="ri-value ${semPgbl.resultFinal < 0 ? 'text-green' : 'text-red'}">${semPgbl.resultFinal < 0 ? '(Restituir) ' : '(A pagar) '}${BRL(Math.abs(semPgbl.resultFinal))}</div>
        <div class="ri-sub">Imposto apurado: ${BRL(semPgbl.impostoFinal)}</div>
      </div>
      <div class="report-item">
        <div class="ri-label">Economia de Imposto</div>
        <div class="ri-value text-green">${BRL(economiaIdeal)}</div>
        <div class="ri-sub">Diferenca de imposto apurado com vs. sem PGBL</div>
      </div>
    </div>
    ${teto.resultFinal < semPgbl.resultFinal ? `<div class="verdict green" style="margin-top:14px">
      <span class="vc-icon">&#128176;</span>
      <span>Com o aporte ideal, ${teto.resultFinal < 0 ? `sua restituicao aumenta em <b>${BRL(Math.abs(teto.resultFinal - semPgbl.resultFinal))}</b>` : `voce paga <b>${BRL(semPgbl.resultFinal - teto.resultFinal)}</b> a menos de imposto`} e ainda constroi patrimonio na previdencia.</span>
    </div>` : ''}`
    }

    // Grafico comparativo
    const maxAbsResult = Math.max(...cenarios.map(c => Math.abs(c.resultFinal)), 1)
    const reportChart = document.getElementById('report-chart')
    if (reportChart) {
      reportChart.innerHTML = cenarios.map(c => {
        const pct = Math.abs(c.resultFinal) / maxAbsResult * 100
        const isRest = c.resultFinal < 0
        const color = isRest ? 'var(--primary)' : 'var(--danger)'
        const tagHtml = c.tag === 'ideal' ? '<span class="tag tag-ideal">IDEAL</span>'
          : c.tag === 'atual' ? '<span class="tag tag-atual">ATUAL</span>'
          : c.tag === 'min' ? '<span class="tag tag-min">MIN</span>' : ''
        const isActive = c.tag === 'ideal'
        return `<div class="chart-row ${isActive ? 'chart-active' : ''}">
          <div class="chart-label">${c.label} ${tagHtml}<br><span style="font-size:10px;color:var(--accent)">${BRL(c.pgblAnual)}/ano</span></div>
          <div class="chart-bars"><div class="chart-bar-inner" style="width:${pct}%;background:${color}"></div></div>
          <div class="chart-val" style="color:${color}">${isRest ? '(Restituir)' : '(A pagar)'}<br><b>${BRL(Math.abs(c.resultFinal))}</b></div>
        </div>`
      }).join('')
    }

    // Aporte minimo
    const reportMinimoContent = document.getElementById('report-minimo-content')
    if (reportMinimoContent) {
      if (minInfo.aporte > 0) {
        const minMensal = minInfo.aporte / 12
        const semRes = semPgbl.resultFinal
        reportMinimoContent.innerHTML = `
      <div class="report-grid">
        <div class="report-item" style="border-color:var(--warn)">
          <div class="ri-label">Aporte Minimo para Resultado Zero</div>
          <div class="ri-value" style="color:var(--warn)">${BRL(minInfo.aporte)}<span style="font-size:13px;color:var(--muted)">/ano</span></div>
          <div class="ri-sub">${BRL(minMensal)}/mes</div>
        </div>
        <div class="report-item">
          <div class="ri-label">Sem esse aporte, voce pagaria</div>
          <div class="ri-value text-red">${BRL(Math.abs(semRes))}</div>
          <div class="ri-sub">de imposto — dinheiro que vai para a Receita em vez do seu patrimonio</div>
        </div>
      </div>
      <div class="verdict warn" style="margin-top:14px">
        <span class="vc-icon">&#9888;&#xFE0F;</span>
        <span>Aplicando pelo menos <b>${BRL(minMensal)}/mes</b> em PGBL, o valor que seria pago de IR vira investimento no seu nome. Abaixo desse valor, parte do imposto e paga sem necessidade.</span>
      </div>`
      } else {
        reportMinimoContent.innerHTML = `
      <div class="verdict green">
        <span class="vc-icon">&#10003;</span>
        <span>Seu resultado ja e restituicao mesmo sem PGBL. Qualquer aporte adicional em PGBL <b>aumenta ainda mais</b> sua restituicao.</span>
      </div>`
      }
    }
  }, [])

  // ── Render calculadora ─────────────────────────────────────────────────────
  const renderCalculadora = useCallback((st: SimState) => {
    const slider = document.getElementById('calcSlider') as HTMLInputElement
    const inputMensal = document.getElementById('calcPgblMensal') as HTMLInputElement
    const inputExtra = document.getElementById('calcPgblExtra') as HTMLInputElement
    const resultDiv = document.getElementById('calc-result')
    if (!slider || !inputMensal || !inputExtra || !resultDiv) return

    slider.max = String(Math.round(st.pgblMaxAnual))
    const sliderMaxLabel = document.getElementById('calcSliderMax')
    if (sliderMaxLabel) sliderMaxLabel.textContent = `Teto: ${BRL(st.pgblMaxAnual)}`

    // Set initial value to current PGBL
    const initialVal = Math.min(st.prevAnualAtual, st.pgblMaxAnual)
    slider.value = String(Math.round(initialVal))
    const initMensal = Math.round(initialVal / 12 * 100) / 100
    inputMensal.value = initMensal.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    function recalc(source: string) {
      let pgblTotal: number
      if (source === 'slider') {
        pgblTotal = parseFloat(slider.value)
        const m = pgblTotal / 12
        inputMensal.value = m.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        inputExtra.value = ''
      } else {
        const mensal = parseVal(inputMensal.value)
        const extra = parseVal(inputExtra.value)
        pgblTotal = Math.min(mensal * 12 + extra, st.pgblMaxAnual)
        slider.value = String(Math.round(pgblTotal))
      }

      const sliderLabel = document.getElementById('calcSliderLabel')
      const sliderPct = document.getElementById('calcSliderPct')
      if (sliderLabel) sliderLabel.textContent = BRL(pgblTotal)
      const pct12 = st.pgblMaxAnual > 0 ? (pgblTotal / st.pgblMaxAnual * 100) : 0
      if (sliderPct) sliderPct.textContent = pct12.toFixed(0) + '% dos 12%'

      const sim = simulaPGBL(st, pgblTotal)
      const semPgbl = simulaPGBL(st, 0)
      const diff = semPgbl.resultFinal - sim.resultFinal

      if (!resultDiv) return
      resultDiv.innerHTML = `
      <div class="calc-result-grid">
        <div class="calc-item ci-accent">
          <div class="ci-label">Aporte PGBL</div>
          <div class="ci-value">${BRL(pgblTotal)}</div>
          <div class="ci-sub">${BRL(pgblTotal / 12)}/mes</div>
        </div>
        <div class="calc-item">
          <div class="ci-label">Imposto Apurado</div>
          <div class="ci-value">${BRL(sim.impostoFinal)}</div>
          <div class="ci-sub">Modelo ${sim.melhor}</div>
        </div>
        <div class="calc-item ${sim.resultFinal < 0 ? 'ci-green' : sim.resultFinal > 0 ? 'ci-red' : ''}">
          <div class="ci-label">${sim.resultFinal < 0 ? 'Restituicao' : sim.resultFinal > 0 ? 'A Pagar' : 'Resultado'}</div>
          <div class="ci-value">${BRL(Math.abs(sim.resultFinal))}</div>
          <div class="ci-sub">Apos descontar IRRF de ${BRL(st.irrfAnual)}</div>
        </div>
        <div class="calc-item ${diff > 0 ? 'ci-green' : ''}">
          <div class="ci-label">Economia vs. Sem PGBL</div>
          <div class="ci-value">${diff > 0 ? '+' : ''}${BRL(diff)}</div>
          <div class="ci-sub">${diff > 0 ? 'Voce ganha mais ou paga menos' : 'Sem diferenca'}</div>
        </div>
      </div>
      <div class="calc-vs">
        Sem PGBL: ${semPgbl.resultFinal < 0 ? 'restituicao de' : 'a pagar'} <b>${BRL(Math.abs(semPgbl.resultFinal))}</b>
        &rarr; Com este aporte: ${sim.resultFinal < 0 ? 'restituicao de' : 'a pagar'} <b>${BRL(Math.abs(sim.resultFinal))}</b>
        &rarr; Diferenca: <b>${diff > 0 ? '+' : ''}${BRL(diff)}</b>
      </div>`
    }

    slider.oninput = () => recalc('slider')
    inputMensal.addEventListener('input', () => recalc('input'))
    inputExtra.addEventListener('input', () => recalc('input'))

    // Initial calculation
    recalc('slider')
  }, [])

  // ── Main calculation ───────────────────────────────────────────────────────
  const calcular = useCallback(() => {
    // Read inputs
    const inputType = (document.querySelector('input[name="inputType"]:checked') as HTMLInputElement)?.value
    const rendaRaw = parseVal((document.getElementById('rendaPrincipal') as HTMLInputElement)?.value || '')
    const outrasRendasM = parseVal((document.getElementById('outrasRendas') as HTMLInputElement)?.value || '')
    const decimoTerceiro = parseVal((document.getElementById('decimoTerceiro') as HTMLInputElement)?.value || '')
    const dependentes = parseInt((document.getElementById('dependentes') as HTMLInputElement)?.value || '') || 0
    const vinculo = (document.getElementById('vinculo') as HTMLSelectElement)?.value
    const inssMode = (document.querySelector('input[name="inssMode"]:checked') as HTMLInputElement)?.value
    const inssManualM = parseVal((document.getElementById('inssManual') as HTMLInputElement)?.value || '')
    const despMedAnual = parseVal((document.getElementById('despMedicas') as HTMLInputElement)?.value || '')
    const despEduAnual = Math.min(parseVal((document.getElementById('despEducacao') as HTMLInputElement)?.value || ''), 3561.50 * (dependentes + 1))
    const pensaoM = parseVal((document.getElementById('pensao') as HTMLInputElement)?.value || '')
    const prevType = (document.querySelector('input[name="prevType"]:checked') as HTMLInputElement)?.value
    const prevMensalVal = parseVal((document.getElementById('prevMensal') as HTMLInputElement)?.value || '')

    // Renda mensal / anual
    let rendaMensal: number, rendaAnual: number
    if (inputType === 'anual') {
      rendaAnual = rendaRaw + (outrasRendasM * 12)
      rendaMensal = rendaAnual / 12
    } else {
      rendaMensal = rendaRaw + outrasRendasM
      rendaAnual = rendaMensal * 12
    }

    if (rendaAnual <= 0) {
      alert('Informe sua renda para continuar.')
      return
    }

    // INSS
    let inssMensal: number
    if (inssMode === 'manual') {
      inssMensal = inssManualM
    } else {
      const salBase = inputType === 'anual' ? rendaRaw / 12 : rendaRaw
      inssMensal = calcINSS(salBase)
      if (vinculo === 'servidor') inssMensal = Math.min(inssMensal * 1.14 / 0.14 * 0.11, INSS_TETO_MENSAL)
    }
    const inssAnual = inssMensal * 12

    // Dependentes
    const deducaoDependentesM = dependentes * 189.59
    const deducaoDependentesAnual = deducaoDependentesM * 12

    // Pensao
    const pensaoAnual = pensaoM * 12

    // PGBL atual (mensal fixo + aportes esporadicos)
    const sporadicTotal = prevType === 'pgbl' ? sporadicEntries.reduce((s, e) => s + e.value, 0) : 0
    const prevAnualAtual = prevType === 'pgbl' ? (prevMensalVal * 12) + sporadicTotal : 0

    // Base de calculo (modelo completo)
    const totalDeducoesAnual = inssAnual + deducaoDependentesAnual + despMedAnual + despEduAnual + pensaoAnual + prevAnualAtual
    const baseCompleta = Math.max(0, rendaAnual - totalDeducoesAnual)

    // Modelo simplificado
    const descontoSimp = Math.min(rendaAnual * 0.20, DESC_SIMPLIFICADO_TETO)
    const baseSimplificada = Math.max(0, rendaAnual - descontoSimp)

    // Impostos
    const impostoCompleto = calcIRPF(baseCompleta)
    const impostoSimplificado = calcIRPF(baseSimplificada)

    const melhorModelo = impostoCompleto <= impostoSimplificado ? 'completo' : 'simplificado'
    const impostoFinal = Math.min(impostoCompleto, impostoSimplificado)
    const baseFinal = melhorModelo === 'completo' ? baseCompleta : baseSimplificada

    // Aliquota efetiva
    const aliqEfetiva = rendaAnual > 0 ? (impostoFinal / rendaAnual) * 100 : 0

    // IRRF
    const irrfMode = (document.querySelector('input[name="irrfMode"]:checked') as HTMLInputElement)?.value
    let irrfAnual: number
    if (irrfMode === 'manual') {
      irrfAnual = parseVal((document.getElementById('irrfManual') as HTMLInputElement)?.value || '')
    } else {
      const salBase = inputType === 'anual' ? rendaRaw / 12 : rendaRaw
      irrfAnual = calcIRRFMensal(salBase) * 12
    }

    // Resultado final
    const resultadoCompleto = impostoCompleto - irrfAnual
    const resultadoSimplificado = impostoSimplificado - irrfAnual
    const resultadoFinal = melhorModelo === 'completo' ? resultadoCompleto : resultadoSimplificado

    // PGBL/FAPI estrategia
    const pgblMaxAnual = rendaAnual * 0.12
    const pgblFaltante = Math.max(0, pgblMaxAnual - prevAnualAtual)
    const pgblFaltanteM = pgblFaltante / 12

    // Imposto SEM nenhum PGBL
    const baseSemPGBL = Math.max(0, rendaAnual - (inssAnual + deducaoDependentesAnual + despMedAnual + despEduAnual + pensaoAnual))
    const impostoSemPGBL = calcIRPF(baseSemPGBL)

    // Imposto COM PGBL no teto
    const baseComPGBLTeto = Math.max(0, baseSemPGBL - pgblMaxAnual)
    const impostoComPGBL = calcIRPF(baseComPGBLTeto)

    const economiaPGBL = Math.max(0, impostoSemPGBL - impostoComPGBL)

    // ── Rendering ──────────────────────────────────────────────────────────

    // KPIs
    const kpiRenda = document.getElementById('kpi-renda')
    const kpiBase = document.getElementById('kpi-base')
    const kpiImposto = document.getElementById('kpi-imposto')
    const kpiIrrf = document.getElementById('kpi-irrf')
    const kpiAliquota = document.getElementById('kpi-aliquota')
    if (kpiRenda) kpiRenda.textContent = BRL(rendaAnual)
    if (kpiBase) kpiBase.textContent = BRL(baseFinal)
    if (kpiImposto) kpiImposto.textContent = BRL(impostoFinal)
    if (kpiIrrf) kpiIrrf.textContent = BRL(irrfAnual)
    if (kpiAliquota) kpiAliquota.textContent = PCT(aliqEfetiva)

    // Resultado principal
    const resBox = document.getElementById('kpi-resultado-box')
    const resLabel = document.getElementById('kpi-resultado-label')
    const resValue = document.getElementById('kpi-resultado')
    const resSub = document.getElementById('kpi-resultado-sub')
    if (resBox) resBox.classList.remove('highlight', 'warn')
    if (resultadoFinal < 0) {
      if (resBox) resBox.classList.add('highlight')
      if (resLabel) resLabel.textContent = 'Imposto a Restituir'
      if (resValue) resValue.textContent = BRL(Math.abs(resultadoFinal))
      if (resSub) resSub.textContent = `Imposto apurado ${BRL(impostoFinal)} - IRRF pago ${BRL(irrfAnual)}`
    } else if (resultadoFinal > 0) {
      if (resBox) resBox.classList.add('warn')
      if (resLabel) resLabel.textContent = 'Imposto a Pagar'
      if (resValue) resValue.textContent = BRL(resultadoFinal)
      if (resSub) resSub.textContent = `Imposto apurado ${BRL(impostoFinal)} - IRRF pago ${BRL(irrfAnual)}`
    } else {
      if (resLabel) resLabel.textContent = 'Resultado'
      if (resValue) resValue.textContent = 'R$ 0,00'
      if (resSub) resSub.textContent = 'Nenhum imposto a pagar ou restituir'
    }

    // IRRF KPI styling
    const irrfBox = document.getElementById('kpi-irrf-box')
    if (irrfBox) {
      irrfBox.style.borderColor = 'var(--accent)'
      irrfBox.style.background = '#131d2e'
    }

    // Bar
    const barPct = Math.min(aliqEfetiva / 27.5 * 100, 100)
    const barFill = document.getElementById('bar-fill')
    const barPctEl = document.getElementById('bar-pct')
    if (barFill) barFill.style.width = barPct + '%'
    if (barPctEl) barPctEl.textContent = PCT(aliqEfetiva)

    // Tabela Etapa 2
    const rows: Array<[string, number | null, number, string]> = [
      ['Renda Bruta Tributavel', rendaMensal, rendaAnual, 'neutral'],
      ['(-) INSS', -inssMensal, -inssAnual, 'red'],
      ['(-) Dependentes (' + dependentes + ')', -deducaoDependentesM, -deducaoDependentesAnual, 'red'],
      ['(-) Despesas Medicas', null, -despMedAnual, 'red'],
      ['(-) Despesas de Educacao', null, -despEduAnual, 'red'],
      ['(-) Pensao Alimenticia', -pensaoM, -pensaoAnual, 'red'],
      ...(prevAnualAtual > 0 ? [['(-) PGBL/FAPI (atual)', -prevMensalVal, -prevAnualAtual, 'red'] as [string, number, number, string]] : []),
      ['= Base de Calculo (Completo)', null, baseCompleta, 'total'],
      ['= Base de Calculo (Simplificado)', null, baseSimplificada, 'total'],
      ['Imposto Apurado (Completo)', null, impostoCompleto, 'warn'],
      ['Imposto Apurado (Simplificado)', null, impostoSimplificado, 'warn'],
      ['(-) IRRF Pago na Fonte', null, -irrfAnual, 'green'],
      ['= Resultado (Completo)', null, resultadoCompleto, resultadoCompleto < 0 ? 'restituir' : 'pagar'],
      ['= Resultado (Simplificado)', null, resultadoSimplificado, resultadoSimplificado < 0 ? 'restituir' : 'pagar'],
    ]

    const tblCalculo = document.getElementById('tbl-calculo')
    if (tblCalculo) {
      tblCalculo.innerHTML = rows.map(([label, m, a, cls]) => {
        const isTotal = cls === 'total'
        const isWarn = cls === 'warn'
        const isRed = cls === 'red' && a !== 0
        const isGreen = cls === 'green' && a !== 0
        const isRestituir = cls === 'restituir'
        const isPagar = cls === 'pagar'
        const mStr = m !== null ? BRL(Math.abs(m)) : '\u2014'
        const aStr = BRL(Math.abs(a))
        const colorM = isRed && m ? 'text-red' : isGreen && m ? 'text-green' : ''
        const colorA = isRed ? 'text-red' : isWarn ? 'text-warn' : isGreen ? 'text-green' : isRestituir ? 'text-green' : isPagar ? 'text-red' : ''
        const rowCls = isTotal ? 'total' : (isRestituir || isPagar) ? 'total' : ''
        const prefix = isRestituir ? '(Restituir) ' : isPagar && a > 0 ? '(A pagar) ' : ''
        return `<tr class="${rowCls}">
          <td>${label}</td>
          <td class="text-right ${colorM}">${mStr}</td>
          <td class="text-right ${colorA}">${prefix}${aStr}</td>
        </tr>`
      }).join('')
    }

    // Comparativo modelos
    const cRec = melhorModelo
    function resTag(val: number) {
      if (val < 0) return `<span class="cv text-green">(Restituir) ${BRL(Math.abs(val))}</span>`
      if (val > 0) return `<span class="cv text-red">(A pagar) ${BRL(val)}</span>`
      return `<span class="cv">R$ 0,00</span>`
    }
    const compareGrid = document.getElementById('compare-grid')
    if (compareGrid) {
      compareGrid.innerHTML = `
    <div class="compare-card ${cRec === 'completo' ? 'recommended' : ''}">
      <h4>Deducoes Legais ${cRec === 'completo' ? '<span class="rec-badge">Recomendado</span>' : ''}</h4>
      <div class="compare-row"><span>Deducoes Detalhadas</span><span class="cv text-green">${BRL(totalDeducoesAnual)}</span></div>
      <div class="compare-row"><span>Base de Calculo</span><span class="cv">${BRL(baseCompleta)}</span></div>
      <div class="compare-row"><span>Imposto Apurado</span><span class="cv text-warn">${BRL(impostoCompleto)}</span></div>
      <div class="compare-row"><span>(-) IRRF Pago</span><span class="cv">${BRL(irrfAnual)}</span></div>
      <div class="compare-row"><span><b>Resultado</b></span>${resTag(resultadoCompleto)}</div>
      <div class="compare-row"><span>Aliquota Efetiva</span><span class="cv">${PCT(rendaAnual > 0 ? impostoCompleto / rendaAnual * 100 : 0)}</span></div>
    </div>
    <div class="compare-card ${cRec === 'simplificado' ? 'recommended' : ''}">
      <h4>Desconto Simplificado ${cRec === 'simplificado' ? '<span class="rec-badge">Recomendado</span>' : ''}</h4>
      <div class="compare-row"><span>Desconto Fixo (20%)</span><span class="cv text-green">${BRL(descontoSimp)}</span></div>
      <div class="compare-row"><span>Base de Calculo</span><span class="cv">${BRL(baseSimplificada)}</span></div>
      <div class="compare-row"><span>Imposto Apurado</span><span class="cv text-warn">${BRL(impostoSimplificado)}</span></div>
      <div class="compare-row"><span>(-) IRRF Pago</span><span class="cv">${BRL(irrfAnual)}</span></div>
      <div class="compare-row"><span><b>Resultado</b></span>${resTag(resultadoSimplificado)}</div>
      <div class="compare-row"><span>Aliquota Efetiva</span><span class="cv">${PCT(rendaAnual > 0 ? impostoSimplificado / rendaAnual * 100 : 0)}</span></div>
    </div>`
    }

    // Estrategia PGBL
    const stratRows: Array<[string, string, string]> = [
      ['Renda Bruta Anual', BRL(rendaAnual), 'neutral'],
      ['Teto PGBL/FAPI (12%)', BRL(pgblMaxAnual), 'accent'],
      ['Aporte Mensal Fixo (anual)', BRL(prevMensalVal * 12), 'neutral'],
      ['Aportes Esporadicos', BRL(sporadicTotal), sporadicTotal > 0 ? 'neutral' : 'muted'],
      ['Total PGBL Atual (anual)', BRL(prevAnualAtual), prevAnualAtual > 0 ? 'neutral' : 'muted'],
      ['Aporte Adicional Necessario (anual)', BRL(pgblFaltante), pgblFaltante > 0 ? 'warn' : 'green'],
      ['Aporte Adicional Necessario (mensal)', BRL(pgblFaltanteM), pgblFaltante > 0 ? 'warn' : 'green'],
      ['Imposto sem PGBL', BRL(impostoSemPGBL), 'red'],
      ['Imposto com PGBL no teto', BRL(impostoComPGBL), 'green'],
      ['Economia de IR com PGBL (anual)', BRL(economiaPGBL), 'highlight'],
    ]

    const strategyRows = document.getElementById('strategy-rows')
    if (strategyRows) {
      strategyRows.innerHTML = stratRows.map(([label, value, cls]) => {
        const colorMap: Record<string, string> = { highlight: 'text-green', green: 'text-green', accent: 'text-accent', warn: 'text-warn', red: 'text-red' }
        const colorCls = colorMap[cls] || ''
        return `<div class="strategy-row">
          <span class="label">${label}</span>
          <span class="value ${colorCls}" style="${cls === 'accent' ? 'color:var(--accent)' : ''}">${value}</span>
        </div>`
      }).join('')
    }

    // Tabela cenarios
    const aliqSem = rendaAnual > 0 ? impostoSemPGBL / rendaAnual * 100 : 0
    const aliqCom = rendaAnual > 0 ? impostoComPGBL / rendaAnual * 100 : 0
    const tblCenarios = document.getElementById('tbl-cenarios')
    if (tblCenarios) {
      tblCenarios.innerHTML = `
    <tr>
      <td>Sem PGBL</td>
      <td class="text-right">${BRL(baseSemPGBL)}</td>
      <td class="text-right text-red">${BRL(impostoSemPGBL)}</td>
      <td class="text-right">${PCT(aliqSem)}</td>
    </tr>
    <tr>
      <td>Com aporte atual${prevAnualAtual > 0 ? ' (' + BRL(prevAnualAtual) + '/ano)' : ''}</td>
      <td class="text-right">${BRL(baseCompleta)}</td>
      <td class="text-right text-warn">${BRL(impostoCompleto)}</td>
      <td class="text-right">${PCT(rendaAnual > 0 ? impostoCompleto / rendaAnual * 100 : 0)}</td>
    </tr>
    <tr class="highlight-row">
      <td>Com PGBL no teto (12%) — ${BRL(pgblMaxAnual)}/ano</td>
      <td class="text-right">${BRL(baseComPGBLTeto)}</td>
      <td class="text-right">${BRL(impostoComPGBL)}</td>
      <td class="text-right">${PCT(aliqCom)}</td>
    </tr>`
    }

    // Veredicto
    let verdictHtml = ''
    if (aliqEfetiva === 0) {
      verdictHtml = `<div class="verdict green"><span class="vc-icon">&#127881;</span><span>Voce esta na faixa de <b>isencao</b> pelo mecanismo de Redutor 2026. Nenhum imposto e devido.</span></div>`
    } else if (melhorModelo === 'completo' && economiaPGBL > 200) {
      verdictHtml = `
      <div class="verdict green"><span class="vc-icon">&#9989;</span><span>Use a <b>Declaracao Completa</b> — suas deducoes superam o desconto simplificado.</span></div>
      <div class="verdict blue" style="margin-top:10px"><span class="vc-icon">&#128161;</span><span>Investindo mais <b>${BRL(pgblFaltante)}/ano</b> em PGBL, voce economiza <b>${BRL(economiaPGBL)}</b> de imposto.</span></div>`
    } else if (melhorModelo === 'simplificado') {
      verdictHtml = `
      <div class="verdict warn"><span class="vc-icon">&#128203;</span><span>O <b>Desconto Simplificado</b> e mais vantajoso para seu perfil — deducoes abaixo de 20% da renda.</span></div>
      ${economiaPGBL > 100 ? `<div class="verdict blue" style="margin-top:10px"><span class="vc-icon">&#128161;</span><span>Ainda assim, aportar em PGBL pode gerar economia de <b>${BRL(economiaPGBL)}</b> ao ano.</span></div>` : ''}`
    } else {
      verdictHtml = `<div class="verdict blue"><span class="vc-icon">&#8505;&#65039;</span><span>Use a <b>Declaracao Completa</b>. Considere elevar aportes em PGBL para maximizar deducoes.</span></div>`
    }
    const verdictBox = document.getElementById('verdict-box')
    if (verdictBox) verdictBox.innerHTML = verdictHtml

    // Save state for interactive calculator
    const simState: SimState = {
      rendaAnual, irrfAnual, inssAnual,
      deducaoDependentesAnual, despMedAnual, despEduAnual, pensaoAnual,
      pgblMaxAnual, baseSemPGBL, impostoSemPGBL,
      prevAnualAtual, impostoCompleto, impostoSimplificado,
      resultadoCompleto, resultadoSimplificado,
      melhorModelo, descontoSimp, totalDeducoesAnual
    }
    simStateRef.current = simState

    // Render report and calculator
    renderReport(simState)
    renderCalculadora(simState)

    // Update investment comparison props
    const minInfo = findAporteMinimo(simState)
    const aliqEfet = rendaAnual > 0 ? impostoFinal / rendaAnual : 0
    setCompProps({
      pgblMaxAnual,
      aporteMinimoPGBL: minInfo.aporte,
      aliquotaMarginalIR: aliqEfet > 0 ? Math.min(aliqEfet * 1.5, 0.275) : 0.15, // approximate marginal rate
      rendaAnual,
    })

    // Show results
    setStep(3)
    setShowResults(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [sporadicEntries, setStep, renderReport, renderCalculadora])

  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    document.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="number"]').forEach(el => { el.value = '' })
    const depEl = document.getElementById('dependentes') as HTMLInputElement
    if (depEl) depEl.value = ''
    setSporadicEntries([])
  }, [])

  // ── Voltar form ────────────────────────────────────────────────────────────
  const voltarForm = useCallback(() => {
    setStep(1)
    setShowResults(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setStep])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="wrapper">

      {/* Header */}
      <header>
        <div className="badge">Ano-calendario 2026</div>
        <h1><span>Dome o Leao</span><br />Simulador IRPF 2026</h1>
        <p>O leao do Imposto de Renda so ruge pra quem nao tem os numeros certos. Descubra quanto pagar, quanto receber e onde investir pra ele ficar mansinho.<br />
        <span style={{ fontSize: '11px', opacity: 0.6 }}>Valores oficiais: Lei 15.191/2025 (tabela) + Lei 15.270/2025 (redutor e desc. simplificado)</span></p>
      </header>

      {/* Step indicator */}
      <div className="steps">
        <div className="step-item active" id="step-nav-1">
          <div className="step-num">1</div>
          <div><b>Dados</b><br /><small style={{ fontSize: '11px', color: 'inherit', opacity: 0.7 }}>Renda e Deducoes</small></div>
        </div>
        <div className="step-item" id="step-nav-2">
          <div className="step-num">2</div>
          <div><b>Calculo</b><br /><small style={{ fontSize: '11px', color: 'inherit', opacity: 0.7 }}>Imposto Devido</small></div>
        </div>
        <div className="step-item" id="step-nav-3">
          <div className="step-num">3</div>
          <div><b>Estrategia</b><br /><small style={{ fontSize: '11px', color: 'inherit', opacity: 0.7 }}>FAPI / PGBL</small></div>
        </div>
      </div>

      {/* ═══════════════════ FORM ═══════════════════ */}
      <div id="form-section" style={{ display: showResults ? 'none' : 'block' }}>

        {/* Bloco A: Renda */}
        <div className="card">
          <div className="card-title">
            <span className="icon">&#128176;</span> Bloco A — Renda
            <a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026" target="_blank" rel="noopener" className="ref-link"><span className="ref-icon">&#8599;</span>IRPF 2026</a>
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Tipo de Entrada</label>
              <div className="toggle-group">
                <input type="radio" name="inputType" id="t-mensal" value="mensal" defaultChecked />
                <label htmlFor="t-mensal">Mensal</label>
                <input type="radio" name="inputType" id="t-anual" value="anual" />
                <label htmlFor="t-anual">Anual</label>
              </div>
            </div>
            <div className="field">
              <label id="rendaLabel">Salario Bruto Mensal</label>
              <small>Inclua pro-labore. Exclua 13o e PLR.</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="rendaPrincipal" placeholder="0,00" />
              </div>
            </div>
            <div className="field">
              <label>Outras Rendas Tributaveis (mensal)</label>
              <small>Aluguel, autonomo, etc.</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="outrasRendas" placeholder="0,00" />
              </div>
            </div>
            <div className="field">
              <label>13o Salario (anual)</label>
              <small>Tributacao exclusiva — informativo.</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="decimoTerceiro" placeholder="0,00" />
              </div>
            </div>
          </div>

          {/* IRRF */}
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <div className="field-grid">
              <div className="field">
                <label>IRRF — Imposto Retido na Fonte</label>
                <div className="toggle-group">
                  <input type="radio" name="irrfMode" id="irrf-auto" value="auto" defaultChecked />
                  <label htmlFor="irrf-auto">Calcular auto</label>
                  <input type="radio" name="irrfMode" id="irrf-manual" value="manual" />
                  <label htmlFor="irrf-manual">Informar</label>
                </div>
              </div>
              <div className="field" id="irrfAutoPreview">
                <label>IRRF Estimado <a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026" target="_blank" rel="noopener" className="ref-link"><span className="ref-icon">&#8599;</span>Tabela IRPF</a></label>
                <small>Valor retido pelo empregador mensalmente</small>
                <div className="inss-computed">
                  <span className="inss-val" id="irrfComputedVal">R$ 0,00</span>
                  <span className="inss-computed-sub" id="irrfComputedAnual">Anual: R$ 0,00</span>
                </div>
              </div>
              <div className="field" id="irrfManualField" style={{ display: 'none' }}>
                <label>IRRF Total Anual</label>
                <small>Confira no Informe de Rendimentos</small>
                <div className="input-wrap">
                  <span className="prefix">R$</span>
                  <input type="text" className="currency" id="irrfManual" placeholder="0,00" />
                </div>
              </div>
            </div>
            <div className="hint-box" style={{ marginTop: '8px' }}>
              O IRRF e o imposto que a empresa ja desconta do seu salario todo mes. Na declaracao, ele e subtraido do imposto apurado: se voce pagou mais do que deve, recebe restituicao.
            </div>
          </div>
        </div>

        {/* Bloco B: Deducoes */}
        <div className="card">
          <div className="card-title">
            <span className="icon">&#128315;</span> Bloco B — Deducoes
            <a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026" target="_blank" rel="noopener" className="ref-link"><span className="ref-icon">&#8599;</span>Receita Federal</a>
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Numero de Dependentes</label>
              <small>R$ 189,59/mes por dependente</small>
              <input type="number" id="dependentes" placeholder="0" min={0} max={20} />
            </div>
            <div className="field">
              <label>INSS</label>
              <div className="toggle-group">
                <input type="radio" name="inssMode" id="inss-auto" value="auto" defaultChecked />
                <label htmlFor="inss-auto">Calcular auto</label>
                <input type="radio" name="inssMode" id="inss-manual" value="manual" />
                <label htmlFor="inss-manual">Informar</label>
              </div>
            </div>
            <div className="field" id="inssField" style={{ display: 'none' }}>
              <label>INSS Mensal Descontado</label>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="inssManual" placeholder="0,00" />
              </div>
            </div>
            <div className="field" id="inssAutoPreview">
              <label>INSS Calculado <a href="https://www.contabilizei.com.br/contabilidade-online/tabela-inss/" target="_blank" rel="noopener" className="ref-link"><span className="ref-icon">&#8599;</span>Tabela INSS</a></label>
              <small>Baseado no salario bruto e vinculo</small>
              <div className="inss-computed">
                <span className="inss-val" id="inssComputedVal">R$ 0,00</span>
                <span className="inss-computed-sub" id="inssComputedAnual">Anual: R$ 0,00</span>
                <div className="inss-help-wrap">
                  <div className="inss-help-btn">?</div>
                  <div className="inss-tooltip" id="inssTooltip">
                    <h4>Calculo Progressivo do INSS</h4>
                    <table>
                      <thead>
                        <tr><th>Faixa</th><th>Aliquota</th><th>Base</th><th>Contrib.</th></tr>
                      </thead>
                      <tbody id="inssTooltipBody"></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="field">
              <label>Vinculo Empregaticio</label>
              <select id="vinculo">
                <option value="clt">CLT (RGPS)</option>
                <option value="servidor">Servidor Publico (RPPS)</option>
                <option value="autonomo">Autonomo (RGPS)</option>
                <option value="socio">Socio / Pro-labore</option>
              </select>
            </div>
            <div className="field">
              <label>Despesas Medicas (anual)</label>
              <small>Plano de saude, consultas, cirurgias — sem limite</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="despMedicas" placeholder="0,00" />
              </div>
            </div>
            <div className="field">
              <label>Despesas de Educacao (anual)</label>
              <small>Faculdade, escola — limite R$ 3.561,50/pessoa</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="despEducacao" placeholder="0,00" />
              </div>
            </div>
            <div className="field">
              <label>Pensao Alimenticia (mensal)</label>
              <small>Apenas judicial — sem limite</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="pensao" placeholder="0,00" />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco C: Previdencia */}
        <div className="card">
          <div className="card-title">
            <span className="icon">&#127974;</span> Bloco C — Previdencia Complementar
            <a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026" target="_blank" rel="noopener" className="ref-link"><span className="ref-icon">&#8599;</span>Limite 12%</a>
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Possui Previdencia Complementar?</label>
              <div className="toggle-group">
                <input type="radio" name="prevType" id="prev-nao" value="nao" defaultChecked />
                <label htmlFor="prev-nao">Nao possuo</label>
                <input type="radio" name="prevType" id="prev-pgbl" value="pgbl" />
                <label htmlFor="prev-pgbl">PGBL</label>
                <input type="radio" name="prevType" id="prev-vgbl" value="vgbl" />
                <label htmlFor="prev-vgbl">VGBL</label>
              </div>
            </div>
            <div className="field" id="prevValorField" style={{ display: 'none' }}>
              <label>Aplicacao Mensal Fixa</label>
              <small>Valor debitado todo mes automaticamente</small>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="prevMensal" placeholder="0,00" />
              </div>
            </div>
          </div>

          {/* Aportes esporadicos */}
          <div id="sporadicSection" style={{ display: 'none', marginTop: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>Aplicacoes Esporadicas</label>
            <small style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', opacity: 0.7, margin: '4px 0 8px' }}>Aportes extras feitos ao longo do ano (ex: bonus, sobra de caixa)</small>
            <div className="sporadic-list" id="sporadicList"></div>
            <div className="add-sporadic-row">
              <div className="field">
                <label>Mes</label>
                <select id="sporadicMonth">
                  <option value="Jan">Janeiro</option>
                  <option value="Fev">Fevereiro</option>
                  <option value="Mar">Marco</option>
                  <option value="Abr">Abril</option>
                  <option value="Mai">Maio</option>
                  <option value="Jun">Junho</option>
                  <option value="Jul">Julho</option>
                  <option value="Ago">Agosto</option>
                  <option value="Set">Setembro</option>
                  <option value="Out">Outubro</option>
                  <option value="Nov">Novembro</option>
                  <option value="Dez">Dezembro</option>
                </select>
              </div>
              <div className="field">
                <label>Valor</label>
                <div className="input-wrap">
                  <span className="prefix">R$</span>
                  <input type="text" className="currency" id="sporadicValue" placeholder="0,00" />
                </div>
              </div>
              <button className="btn-sm" type="button" onClick={() => addSporadic()}>+ Adicionar</button>
            </div>
            <div className="sporadic-total" id="sporadicTotal" style={{ display: 'none' }}>
              <span>Total de aportes esporadicos no ano</span>
              <span className="st-val" id="sporadicTotalVal">R$ 0,00</span>
            </div>
          </div>

          <div className="hint-box" id="prevHint" style={{ marginTop: '14px' }}>
            O PGBL permite deduzir ate 12% da renda bruta tributavel. O VGBL nao e dedutivel do IR — mas pode fazer parte da estrategia patrimonial.
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-outline" onClick={() => resetForm()}>Limpar</button>
          <button className="btn btn-primary" onClick={() => calcular()}>&#9654;&#xFE0E; Calcular IRPF</button>
        </div>
      </div>

      {/* ═══════════════════ RESULTS ═══════════════════ */}
      <div id="results" style={{ display: showResults ? 'block' : 'none' }}>

        <div className="result-header">
          <h2>Resultado da Simulacao</h2>
          <p id="result-subtitle">Ano-calendario 2026 — Declaracao 2027</p>
        </div>

        {/* Resultado principal */}
        <div className="kpi resultado-kpi" id="kpi-resultado-box" style={{ marginBottom: '16px', padding: '20px 24px' }}>
          <div className="kpi-label" id="kpi-resultado-label">Resultado</div>
          <div className="kpi-value" id="kpi-resultado" style={{ fontSize: '28px' }}>&mdash;</div>
          <div id="kpi-resultado-sub" style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}></div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi accent">
            <div className="kpi-label">Renda Bruta Anual</div>
            <div className="kpi-value" id="kpi-renda">&mdash;</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Base de Calculo</div>
            <div className="kpi-value" id="kpi-base">&mdash;</div>
          </div>
          <div className="kpi warn">
            <div className="kpi-label">Imposto Apurado</div>
            <div className="kpi-value" id="kpi-imposto">&mdash;</div>
          </div>
          <div className="kpi" id="kpi-irrf-box">
            <div className="kpi-label">IRRF Ja Pago</div>
            <div className="kpi-value" id="kpi-irrf">&mdash;</div>
          </div>
          <div className="kpi highlight">
            <div className="kpi-label">Aliquota Efetiva</div>
            <div className="kpi-value" id="kpi-aliquota">&mdash;</div>
          </div>
        </div>

        {/* Aliquota bar */}
        <div className="bar-wrap card" style={{ padding: '18px 24px' }}>
          <div className="bar-label">
            <span>Aliquota Efetiva</span>
            <span id="bar-pct">0%</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" id="bar-fill" style={{ width: '0%' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
            <span>0% (Isento)</span>
            <span>27,5% (Teto)</span>
          </div>
        </div>

        {/* Etapa 2: Tabela detalhada */}
        <div className="section-title">Etapa 2 — Detalhamento do Calculo</div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-right">Mensal</th>
                  <th className="text-right">Anual</th>
                </tr>
              </thead>
              <tbody id="tbl-calculo"></tbody>
            </table>
          </div>
        </div>

        {/* Modelo Simplificado vs Completo */}
        <div className="section-title">Comparativo — Modelo de Declaracao</div>
        <div className="compare-grid" id="compare-grid"></div>

        {/* Etapa 3: Estrategia FAPI/PGBL */}
        <div className="section-title">Etapa 3 — Estrategia FAPI / PGBL</div>

        <div className="strategy-box">
          <h3>&#127919;&#xFE0F; Aporte Ideal em Previdencia Complementar</h3>
          <div id="strategy-rows"></div>
        </div>

        {/* Sem FAPI vs Com FAPI */}
        <div className="section-title">Impacto do Aporte — Antes e Depois</div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cenario</th>
                  <th className="text-right">Base de Calculo</th>
                  <th className="text-right">Imposto</th>
                  <th className="text-right">Aliquota Efetiva</th>
                </tr>
              </thead>
              <tbody id="tbl-cenarios"></tbody>
            </table>
          </div>
        </div>

        {/* Verdict */}
        <div id="verdict-box"></div>

        {/* Relatorio Completo PGBL */}
        <div className="section-title">Relatorio — Aporte Ideal PGBL/FAPI</div>

        {/* Resumo do aporte ideal */}
        <div className="card" id="report-ideal">
          <div className="card-title"><span className="icon">&#127919;</span> Aporte Ideal para Maxima Restituicao</div>
          <div id="report-ideal-content"></div>
        </div>

        {/* Grafico comparativo */}
        <div className="card" id="report-chart-card">
          <div className="card-title"><span className="icon">&#128202;</span> Comparativo — Resultado por Nivel de Aporte PGBL</div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--primary)' }}></span>Restituicao</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--danger)' }}></span>A pagar</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--accent)' }}></span>Aporte PGBL</span>
          </div>
          <div id="report-chart"></div>
        </div>

        {/* Aporte minimo */}
        <div className="card" id="report-minimo">
          <div className="card-title"><span className="icon">&#9888;&#xFE0F;</span> Aporte Minimo — Nao &quot;Perder Dinheiro&quot;</div>
          <div id="report-minimo-content"></div>
        </div>

        {/* Calculadora interativa */}
        <div className="section-title">Calculadora Interativa de Aportes</div>
        <div className="card" id="calc-interativo">
          <div className="card-title"><span className="icon">&#128297;</span> Simule diferentes aportes em PGBL</div>
          <div className="field-grid">
            <div className="field">
              <label>Aporte Mensal PGBL</label>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="calcPgblMensal" placeholder="0,00" />
              </div>
            </div>
            <div className="field">
              <label>Aporte Extra Anual (esporadico)</label>
              <div className="input-wrap">
                <span className="prefix">R$</span>
                <input type="text" className="currency" id="calcPgblExtra" placeholder="0,00" />
              </div>
            </div>
          </div>
          <div className="slider-wrap" style={{ marginTop: '14px' }}>
            <div className="bar-label">
              <span>Aporte total: <b id="calcSliderLabel">R$ 0,00</b> / ano</span>
              <span id="calcSliderPct">0% dos 12%</span>
            </div>
            <input type="range" id="calcSlider" min={0} max={100} defaultValue={0} style={{ width: '100%', accentColor: 'var(--primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              <span>R$ 0</span>
              <span id="calcSliderMax">Teto 12%</span>
            </div>
          </div>
          <div id="calc-result" style={{ marginTop: '16px' }}></div>
        </div>

        {/* Comparativo de Investimentos */}
        {compProps && (
          <ComparativoInvestimentos
            pgblMaxAnual={compProps.pgblMaxAnual}
            aporteMinimoPGBL={compProps.aporteMinimoPGBL}
            aliquotaMarginalIR={compProps.aliquotaMarginalIR}
            rendaAnual={compProps.rendaAnual}
          />
        )}

        <div className="notice">
          &#9888; Simulacao baseada nas regras oficiais para o ano-calendario 2026, incluindo o Redutor de Imposto (Lei 15.270/2025) para isencao ate R$&nbsp;5.000/mes com reducao gradual ate R$&nbsp;7.350/mes. Consulte um contador para planejamento definitivo.
        </div>

        {/* Fontes oficiais */}
        <div className="card refs-footer">
          <h4>Fontes Oficiais</h4>
          <ul>
            <li><span className="ref-tag">1</span><a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026" target="_blank" rel="noopener">Receita Federal — Tabelas IRPF 2026 (faixas, aliquotas, deducoes)</a></li>
            <li><span className="ref-tag">2</span><a href="https://www.gov.br/secom/pt-br/acompanhe-a-secom/noticias/2026/01/nova-tabela-do-ir-veja-faixas-e-aliquotas-e-saiba-mais-sobre-medida-que-isenta-o-pagamento-para-quem-ganha-ate-r-5-mil" target="_blank" rel="noopener">Gov.br — Nova Tabela IR: faixas, aliquotas e isencao ate R$ 5 mil</a></li>
            <li><span className="ref-tag">3</span><a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-191-2025" target="_blank" rel="noopener">Receita Federal — Exemplos de aplicacao da Lei 15.270/2025 (redutor)</a></li>
            <li><span className="ref-tag">4</span><a href="https://www.contabilizei.com.br/contabilidade-online/tabela-inss/" target="_blank" rel="noopener">Tabela INSS 2026 — Aliquotas progressivas e teto (R$ 8.475,55)</a></li>
            <li><span className="ref-tag">5</span><a href="https://www.sager.adv.br/novo-limite-desconto-simplificado-irpf-2026/" target="_blank" rel="noopener">Lei 15.270/2025 — Desconto simplificado: novo teto R$ 17.640,00</a></li>
          </ul>
        </div>

        <div className="actions" style={{ marginTop: '24px' }}>
          <button className="btn btn-outline" onClick={() => voltarForm()}>&#8592; Editar Dados</button>
          <button className="btn btn-primary" onClick={() => window.print()}>&#128438; Imprimir</button>
        </div>
      </div>

    </div>
  )
}
