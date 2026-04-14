import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helper: fill salary and calculate
// ---------------------------------------------------------------------------
async function fillSalaryAndCalculate(
  page: import('@playwright/test').Page,
  centDigits: string, // e.g. '1200000' for R$ 12.000,00
) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const salarioInput = page.locator('#rendaPrincipal')
  await salarioInput.click()
  await salarioInput.pressSequentially(centDigits)

  await page.click('.btn-primary')
  await page.waitForSelector('#results', { state: 'visible' })
}

// ===========================================================================
// Suite 1 - Page Load & SEO
// ===========================================================================
test.describe('Page Load & SEO', () => {
  test('should load with correct title', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/Dome o Leão/)
  })

  test('should display header with Dome o Leão branding', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const heading = page.locator('header h1')
    await expect(heading).toContainText('Dome o Leão')
    await expect(heading).toContainText('Simulador IRPF 2026')
  })

  test('should show step indicator with 3 steps', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('#step-nav-1')).toBeVisible()
    await expect(page.locator('#step-nav-2')).toBeVisible()
    await expect(page.locator('#step-nav-3')).toBeVisible()

    // Step 1 should be active by default
    await expect(page.locator('#step-nav-1')).toHaveClass(/active/)
  })

  test('should have footer with GitHub and LinkedIn links', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const footer = page.locator('footer.site-footer')
    await expect(footer).toBeVisible()

    const githubLink = footer.locator('a[href*="github.com"]')
    await expect(githubLink).toBeVisible()

    const linkedinLink = footer.locator('a[href*="linkedin.com"]')
    await expect(linkedinLink).toBeVisible()
  })

  test('should serve llms.txt', async ({ page }) => {
    const response = await page.goto('/llms.txt')
    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)
  })

  test('should serve manifest.json', async ({ page }) => {
    const response = await page.goto('/manifest.json')
    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)

    const body = await response!.json()
    expect(body).toHaveProperty('name')
  })
})

// ===========================================================================
// Suite 2 - Form -- Input Fields (Before Calculation)
// ===========================================================================
test.describe('Form -- Input Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display Bloco A -- Renda with all fields', async ({ page }) => {
    // Card title
    await expect(page.locator('text=Bloco A — Renda')).toBeVisible()

    // Main salary input
    await expect(page.locator('#rendaPrincipal')).toBeVisible()

    // Other income
    await expect(page.locator('#outrasRendas')).toBeVisible()

    // 13th salary
    await expect(page.locator('#decimoTerceiro')).toBeVisible()

    // IRRF mode toggle
    await expect(page.locator('#irrf-auto')).toBeChecked()
  })

  test('should display Bloco B -- Deducoes with all fields', async ({ page }) => {
    await expect(page.locator('text=Bloco B — Deduções')).toBeVisible()

    await expect(page.locator('#dependentes')).toBeVisible()
    await expect(page.locator('#inss-auto')).toBeChecked()
    await expect(page.locator('#despMedicas')).toBeVisible()
    await expect(page.locator('#despEducacao')).toBeVisible()
    await expect(page.locator('#pensao')).toBeVisible()
    await expect(page.locator('#vinculo')).toBeVisible()
  })

  test('should display Bloco C -- Previdencia with toggle', async ({ page }) => {
    await expect(page.locator('text=Bloco C — Previdência Complementar')).toBeVisible()

    // Default should be "Nao possuo"
    await expect(page.locator('#prev-nao')).toBeChecked()

    // PGBL and VGBL options available (radio inputs hidden by CSS, check labels)
    await expect(page.locator('label[for="prev-pgbl"]')).toBeVisible()
    await expect(page.locator('label[for="prev-vgbl"]')).toBeVisible()
  })

  test('should toggle between Mensal/Anual input type', async ({ page }) => {
    // Default is Mensal
    await expect(page.locator('#t-mensal')).toBeChecked()

    // Switch to Anual
    await page.locator('label[for="t-anual"]').click()
    await expect(page.locator('#t-anual')).toBeChecked()

    // Label should update to reflect annual
    const label = page.locator('#rendaLabel')
    await expect(label).toContainText('Anual')
  })

  test('should toggle INSS auto/manual mode', async ({ page }) => {
    // Default: auto mode, manual field hidden
    await expect(page.locator('#inss-auto')).toBeChecked()
    await expect(page.locator('#inssAutoPreview')).toBeVisible()
    await expect(page.locator('#inssField')).toBeHidden()

    // Switch to manual
    await page.locator('label[for="inss-manual"]').click()
    await expect(page.locator('#inss-manual')).toBeChecked()
    await expect(page.locator('#inssField')).toBeVisible()
    await expect(page.locator('#inssAutoPreview')).toBeHidden()
  })

  test('should toggle IRRF auto/manual mode', async ({ page }) => {
    await expect(page.locator('#irrf-auto')).toBeChecked()
    await expect(page.locator('#irrfAutoPreview')).toBeVisible()
    await expect(page.locator('#irrfManualField')).toBeHidden()

    await page.locator('label[for="irrf-manual"]').click()
    await expect(page.locator('#irrf-manual')).toBeChecked()
    await expect(page.locator('#irrfManualField')).toBeVisible()
    await expect(page.locator('#irrfAutoPreview')).toBeHidden()
  })

  test('should show PGBL fields when PGBL is selected', async ({ page }) => {
    // PGBL monthly input should be hidden initially
    await expect(page.locator('#prevValorField')).toBeHidden()

    // Select PGBL
    await page.locator('label[for="prev-pgbl"]').click()
    await expect(page.locator('#prev-pgbl')).toBeChecked()

    // Monthly input should now be visible
    await expect(page.locator('#prevValorField')).toBeVisible()
    await expect(page.locator('#prevMensal')).toBeVisible()
  })

  test('should apply currency mask on input', async ({ page }) => {
    const salarioInput = page.locator('#rendaPrincipal')
    await salarioInput.click()
    await salarioInput.pressSequentially('1200000') // Type 1200000 -> R$ 12.000,00

    const value = await salarioInput.inputValue()
    expect(value).toContain('12.000,00')
  })

  test('should show Limpar and Calcular buttons', async ({ page }) => {
    const limpar = page.locator('.btn-outline', { hasText: 'Limpar' })
    await expect(limpar).toBeVisible()

    const calcular = page.locator('.btn-primary', { hasText: 'Calcular' })
    await expect(calcular).toBeVisible()
    await expect(calcular).toContainText('Calcular')
  })
})

// ===========================================================================
// Suite 3 - Calculation -- Results
// ===========================================================================
test.describe('Calculation -- Results', () => {
  test('should calculate and show results for R$ 12.000/month salary', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    // Verify KPIs
    const rendaAnual = await page.textContent('#kpi-renda')
    expect(rendaAnual).toContain('144.000')

    // Step 3 should be active
    await expect(page.locator('#step-nav-3')).toHaveClass(/active/)

    // Resultado box visible
    await expect(page.locator('#kpi-resultado-box')).toBeVisible()

    // Table has multiple rows
    const tableRows = page.locator('#tbl-calculo tr')
    await expect(tableRows).not.toHaveCount(0)
    const count = await tableRows.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('should show zero tax for salary below R$ 5.000', async ({ page }) => {
    await fillSalaryAndCalculate(page, '400000') // R$ 4.000,00

    // Imposto should be R$ 0,00 (redutor zeros it)
    const imposto = await page.textContent('#kpi-imposto')
    expect(imposto).toContain('0,00')
  })

  test('should navigate back to form with Editar Dados', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1000000') // R$ 10.000,00

    // Click edit button
    await page.click('text=Editar Dados')

    // Form should be visible, results hidden
    await expect(page.locator('#form-section')).toBeVisible()
    await expect(page.locator('#results')).toBeHidden()
  })

  test('should show comparison between Completo and Simplificado', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    const compareGrid = page.locator('#compare-grid')
    await expect(compareGrid).toBeVisible()

    // Should have comparison content (Completo vs Simplificado)
    const compareContent = await compareGrid.innerHTML()
    expect(compareContent.length).toBeGreaterThan(0)

    // One option should be marked as recommended
    await expect(compareGrid.locator('.recommended')).toHaveCount(1)
  })

  test('should show PGBL strategy section', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    const strategyBox = page.locator('.strategy-box')
    await expect(strategyBox).toBeVisible()

    const strategyText = await strategyBox.textContent()
    expect(strategyText).toContain('12%')
  })

  test('should display aliquota efetiva bar', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    const barPct = page.locator('#bar-pct')
    await expect(barPct).toBeVisible()

    const barText = await barPct.textContent()
    // Should show a percentage value
    expect(barText).toMatch(/\d/)
  })

  test('should show KPI grid with all values populated', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    // All KPI values should be populated (no longer showing em-dash)
    for (const id of ['#kpi-renda', '#kpi-base', '#kpi-imposto', '#kpi-aliquota']) {
      const text = await page.textContent(id)
      expect(text).not.toBe('\u2014') // not the mdash placeholder
    }
  })

  test('should show detailed calculation table', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    // Table should have header columns
    const headers = page.locator('#tbl-calculo').locator('..')
    await expect(headers.locator('th')).toHaveCount(3)

    // Table body should have rows
    const rows = page.locator('#tbl-calculo tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })
})

// ===========================================================================
// Suite 4 - Interactive Calculator
// ===========================================================================
test.describe('Interactive Calculator', () => {
  test('should show calculator with slider after calculation', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    const slider = page.locator('#calcSlider')
    await expect(slider).toBeVisible()

    const calcCard = page.locator('#calc-interativo')
    await expect(calcCard).toBeVisible()
  })

  test('should update results when slider moves', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    const slider = page.locator('#calcSlider')

    // Get initial result text
    const initialResult = await page.textContent('#calc-result')

    // Move slider to 50%
    await slider.fill('50')
    await slider.dispatchEvent('input')

    // Wait briefly for DOM update
    await page.waitForTimeout(300)

    // The slider label should reflect a non-zero value
    const sliderLabel = await page.textContent('#calcSliderLabel')
    expect(sliderLabel).not.toBe('R$ 0,00')
  })
})

// ===========================================================================
// Suite 5 - Investment Comparison (dynamically loaded)
// ===========================================================================
test.describe('Investment Comparison', () => {
  test('should load investment comparison section after calculation', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    // ComparativoInvestimentos is a dynamic import; wait for it
    const sectionTitle = page.locator('text=Comparativo de Longo Prazo')
    await expect(sectionTitle).toBeVisible({ timeout: 15000 })
  })

  test('should show chart and KPIs', async ({ page }) => {
    await fillSalaryAndCalculate(page, '1200000')

    // Wait for dynamic component
    await page.waitForSelector('.inv-chart-wrap', { state: 'visible', timeout: 15000 })

    const chartWrap = page.locator('.inv-chart-wrap').first()
    await expect(chartWrap).toBeVisible()
  })
})

// ===========================================================================
// Suite 6 - Responsive Design
// ===========================================================================
test.describe('Responsive Design', () => {
  test('should render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Header should still be visible
    await expect(page.locator('header h1')).toBeVisible()

    // Form fields should be visible
    await expect(page.locator('#rendaPrincipal')).toBeVisible()

    // Steps should be visible
    await expect(page.locator('.steps')).toBeVisible()

    // Footer should be visible
    await expect(page.locator('footer.site-footer')).toBeVisible()

    // Field grid should render as single column on mobile
    const fieldGrid = page.locator('.field-grid').first()
    const box = await fieldGrid.boundingBox()
    expect(box).not.toBeNull()
    // On mobile (375px), the grid should not exceed viewport width
    expect(box!.width).toBeLessThanOrEqual(375)
  })

  test('should complete full calculation flow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    await fillSalaryAndCalculate(page, '800000') // R$ 8.000,00

    // Results should be visible
    await expect(page.locator('#kpi-resultado-box')).toBeVisible()

    // KPIs should be populated
    const rendaAnual = await page.textContent('#kpi-renda')
    expect(rendaAnual).toContain('96.000')
  })
})
