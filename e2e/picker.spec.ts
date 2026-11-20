import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectNoAxeViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude('.swatch').analyze()
  expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`)).toEqual([])
}

test('asks for a brand color before showing results', async ({ page }) => {
  await page.goto('/')
  const input = page.getByLabel('Brand color', { exact: false }).and(page.getByRole('textbox'))
  await expect(input).toHaveValue('')
  await expect(input).toHaveAttribute('placeholder', 'for example, #E63946')
  await expect(input).toHaveAttribute('required', '')
  await expect(page.locator('.needs-color-note').first()).toHaveText('Enter your brand color in step 1 first.')
  await expect(page.locator('#description')).toBeHidden()
  await input.press('Enter')
  expect(await input.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe('Enter a brand color to continue.')
  await expect(input).toHaveAccessibleDescription('Supported formats: HEX, RGB, HSL, OKLCH')
  await expectNoAxeViolations(page)
})

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith('asks for a brand color')) return
  await page.goto('/')
  await page.getByRole('textbox', { name: /Brand color/ }).fill('#E63946')
})

test('has no axe violations in the light and dark themes', async ({ page }) => {
  await expectNoAxeViolations(page)
  await page.getByRole('switch', { name: 'Dark theme' }).click()
  await expectNoAxeViolations(page)
})

test('has no axe violations with an error and a recommendation shown', async ({ page }) => {
  await page.getByRole('textbox', { name: /Brand color/ }).fill('#E6394')
  await page.getByRole('textbox', { name: /Brand color/ }).press('Enter')
  await page.getByRole('button', { name: 'Show recommendation' }).click()
  await expectNoAxeViolations(page)
})

test('steps are headings in order', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    '1. Brand color', '2. Text color and size', '3. Hover', '4. Result CSS',
  ])
})

test('walks the main scenario for #E63946', async ({ page }) => {
  await expect(page.locator('#description')).toHaveText('Vivid warm red (vivid reddish orange)')
  await expect(page.locator('#wcag-text')).toHaveText('Fails WCAG AA, 4.17:1 (needs 4.5:1). Try large bold text.')

  await page.getByRole('button', { name: 'Show recommendation' }).click()
  await expect(page.locator('#recommendation-title')).toHaveText('Recommended: white, 19px, bold (700)')
  await expect(page.getByLabel('Font size, px')).toHaveValue('19')
  await expect(page.locator('#announcer')).toHaveText('Recommended: white 19px bold text on vivid warm red (vivid reddish orange). Mid-lightness background: only large text reaches the contrast.Large text only. Passes WCAG AA, 4.17:1 (needs 3:1).Reads well according to APCA.')
  await expect(page.getByLabel('Font weight')).toHaveValue('700')
  await expect(page.locator('#wcag-text')).toHaveText('Large text only. Passes WCAG AA, 4.17:1 (needs 3:1).')
  await expect(page.locator('#hover-wcag-text')).toHaveText('Passes WCAG AA, 4.94:1 (needs 3:1).')
  await expect(page.locator('#hover-hex')).toHaveText('#D7283A')

  await expect(page.locator('#css-code')).toContainText('--brand-hover: #D7283A;')
  await expect(page.locator('#css-code')).toContainText('--brand-text-size: 1.1875rem;')
})

test('formally passing black text is hard to read', async ({ page }) => {
  await page.getByRole('radio', { name: 'Black' }).check()
  await expect(page.locator('#announcer')).toHaveText('Black 16px regular text on vivid warm red (vivid reddish orange). Hard to read according to APCA.Passes WCAG AA, 5.04:1 (needs 4.5:1).')
  await page.getByLabel('Font weight').selectOption('600')
  await expect(page.locator('#wcag-text')).toHaveText('Passes WCAG AA, 5.04:1 (needs 4.5:1).')
  await expect(page.locator('#apca-text')).toHaveText('Hard to read.')
})

test('shows a readable error for a wrong color', async ({ page }) => {
  const input = page.getByRole('textbox', { name: /Brand color/ })
  await input.fill('#E6394')
  await input.press('Enter')
  expect(await input.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false)
  expect(await input.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe('Can’t read this color.')
})

test('slider stays silent while the arrow is held and speaks once after a pause', async ({ page }) => {
  await page.getByRole('radio', { name: 'Pick a color' }).check()
  const slider = page.getByRole('slider', { name: 'Lightness' })
  const announcer = page.locator('#announcer')
  await expect(slider).toHaveAttribute('aria-valuetext', '61% lightness')

  await expect(announcer).toContainText('Current color')
  await slider.focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')

  await expect(slider).toHaveAttribute('aria-valuetext', '61% lightness')
  await expect(page.locator('#description')).toHaveText('Vivid warm red (vivid reddish orange)')

  await expect(slider).toHaveAttribute('aria-valuetext', '66% lightness')
  await expect(announcer).toHaveText('Vivid warm red (vivid reddish orange)')
})

test('hue wraps from 359 to 0', async ({ page }) => {
  await page.getByRole('radio', { name: 'Pick a color' }).check()
  const slider = page.getByRole('slider', { name: 'Hue' })
  await slider.focus()
  await page.keyboard.press('End')
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuetext', /, 0 degrees$/)
})

test('recommends large white text for #2A9D8F', async ({ page }) => {
  await page.getByRole('textbox', { name: /Brand color/ }).fill('#2A9D8F')
  await page.getByRole('button', { name: 'Show recommendation' }).click()
  await expect(page.locator('#recommendation-title')).toHaveText('Recommended: white, 19px, bold (700)')
})

test('copies the result CSS', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy Result CSS' }).click()
  await expect(page.locator('#announcer')).toHaveText('CSS copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('--brand: oklch(61.2% 0.208 22.2);')
})

test('a given color is read only and heard once', async ({ page }) => {
  await expect(page.getByRole('slider', { name: 'Lightness' })).toBeHidden()
  await expect(page.locator('#l-value')).toHaveText('61%')
  await expect(page.locator('#css-code')).toContainText('#E63946, given')
  await expect(page.locator('#announcer')).toHaveText('Vivid warm red (vivid reddish orange)')
  await expect(page.locator('#color-summary')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('#panels')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('textbox', { name: /Brand color/ })).not.toHaveAccessibleDescription(/Vivid warm red/)

  await page.getByRole('textbox', { name: /Brand color/ }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('radio', { name: 'White' })).toBeFocused()
})

test('picking a color hides the brand color field', async ({ page }) => {
  await page.getByRole('radio', { name: 'Pick a color' }).check()
  await expect(page.locator('#announcer')).toHaveText('Current color: Vivid warm red (vivid reddish orange). Change it with the sliders below.')
  await expect(page.getByRole('textbox', { name: /Brand color/ })).toBeHidden()
  await expect(page.getByRole('slider', { name: 'Hue' })).toBeVisible()
})

test('clearing the brand color hides the results again', async ({ page }) => {
  await expect(page.locator('#description')).toHaveText('Vivid warm red (vivid reddish orange)')
  await page.getByRole('textbox', { name: /Brand color/ }).fill('')
  await expect(page.locator('#description')).toBeHidden()
  await expect(page.locator('.needs-color-note').first()).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Brand color/ })).not.toHaveAccessibleDescription(/Vivid warm red/)
})

test('entering the text color step tells the current state', async ({ page }) => {
  await page.getByRole('textbox', { name: /Brand color/ }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('radio', { name: 'White' })).toBeFocused()
  await expect(page.locator('#announcer')).toContainText('White 16px regular text on vivid warm red (vivid reddish orange). Fails WCAG AA, 4.17:1 (needs 4.5:1). Try large bold text.')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('#announcer')).toContainText('White 16px regular text on vivid warm red (vivid reddish orange).')
})

test('an impossible combination is named and blocks the next steps', async ({ page }) => {
  await page.getByRole('radio', { name: 'Pick a color' }).check()
  const chroma = page.getByRole('slider', { name: 'Chroma' })
  await chroma.focus()
  await page.keyboard.press('End')
  await expect(chroma).toHaveAttribute('aria-valuenow', '0.37')
  await expect(page.getByRole('slider', { name: 'Lightness' })).toHaveAttribute('aria-valuetext', '61% lightness')
  await expect(page.locator('#description')).toHaveText('Outside the standard screen range')
  await expect(page.locator('#announcer')).toHaveText('Outside the standard screen range. Lower chroma to 0.24.')
  await expect(page.locator('.needs-color-note').first()).toHaveText('Choose a color within the standard screen range in step 1 first.')
  await expect(page.locator('#css-code')).toBeHidden()
})
