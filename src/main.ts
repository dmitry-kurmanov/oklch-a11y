import './style.css'
import { drawSlice, pickFromChart } from './components/chart.ts'
import { createSlider, SETTLE_DELAY } from './components/slider.ts'
import { NO_RECOMMENDATION, recommend, weightName, type TextCheck, type TextColor, type TextStyle } from './lib/contrast.ts'
import { hoverDirection } from './lib/css.ts'
import { debounce } from './lib/debounce.ts'
import {
  CHROMA_HINT, chromaValueText, describeColor, hueHint, hueName, hueValueText, LIGHTNESS_HINT, lightnessValueText,
} from './lib/describe.ts'
import { clampChannel, formatOklch, parseColor, toHex, toRgb, type Channel, type Oklch } from './lib/oklch.ts'
import { initPreferences } from './preferences.ts'
import {
  $check, $color, $css, $editable, $fontSize, $fontWeight, $hasColor, $hover, $hoverCheck, $original, $shift, $source,
  $style, $textColor, type ColorSource,
} from './store.ts'

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

initPreferences(byId<HTMLInputElement>('theme-toggle'))

const announcer = byId('announcer')
let pendingAnnouncement: () => string[] = () => []

function announceNow(lines: string[]): void {
  announcer.replaceChildren()
  requestAnimationFrame(() => {
    announcer.replaceChildren(...lines.map(line => Object.assign(document.createElement('p'), { textContent: line })))
  })
}

const announceLater = debounce(() => announceNow(pendingAnnouncement()), SETTLE_DELAY)

function scheduleAnnouncement(lines: () => string[]): void {
  pendingAnnouncement = lines
  announceLater()
}

function verdicts(check: TextCheck): string[] {
  const wcag = check.wcagText
  const apca = `${check.apcaText} according to APCA.`
  return check.wcagPasses && !check.readsWell ? [apca, wcag] : [wcag, apca]
}

function verdictLines(prefix: string, check: TextCheck): string[] {
  const [first, second] = verdicts(check)
  return [`${prefix}. ${first}`, second]
}

function textPair(style: TextStyle): string {
  const color = style.color === 'white' ? 'White' : 'Black'
  return `${color} ${style.size}px ${weightName(style.weight)} text on ${lowerFirst(describeColor($color.get()))}`
}

const descriptionSummary = (): string[] => [describeColor($color.get())]

function lowerFirst(text: string): string {
  return `${text[0].toLowerCase()}${text.slice(1)}`
}

const colorSummary = (): string[] => {
  return verdictLines(textPair($style.get()), $check.get())
}

const hoverSummary = (): string[] => {
  const percent = Math.round($shift.get() * 100)
  return verdictLines(`Hover, ${percent}% ${hoverDirection($textColor.get())}`, $hoverCheck.get())
}

const brandInput = byId<HTMLInputElement>('brand-input')
const EMPTY_BRAND = 'Enter a brand color to continue.'
const UNREADABLE_BRAND = 'Can’t read this color.'

function validateBrand(): void {
  const value = brandInput.value.trim()
  brandInput.setCustomValidity(!value ? EMPTY_BRAND : parseColor(value) ? '' : UNREADABLE_BRAND)
}

validateBrand()

brandInput.addEventListener('input', () => {
  validateBrand()
  if (!brandInput.value.trim()) {
    $original.set(null)
    return
  }
  const color = parseColor(brandInput.value)
  if (!color) return
  $original.set(color)
  $color.set(color)
  syncSliders(color)
  scheduleAnnouncement(descriptionSummary)
})

byId('brand-field').addEventListener('submit', event => event.preventDefault())

function setChannel(channel: Channel, value: number): void {
  $color.set({ ...$color.get(), [channel]: clampChannel(channel, value) })
}

const sliders = {
  l: createSlider({
    thumb: byId('l-slider'), track: byId('l-track'), min: 0, max: 1, step: 0.01, bigStep: 0.1,
    valueText: lightnessValueText,
    onInput: value => setChannel('l', value),
    onSettle: () => announceNow(descriptionSummary()),
  }),
  c: createSlider({
    thumb: byId('c-slider'), track: byId('c-track'), min: 0, max: 0.37, step: 0.005, bigStep: 0.05,
    valueText: chromaValueText,
    onInput: value => setChannel('c', value),
    onSettle: () => announceNow(descriptionSummary()),
  }),
  h: createSlider({
    thumb: byId('h-slider'), track: byId('h-track'), min: 0, max: 359, step: 1, bigStep: 15, wrap: true,
    valueText: hueValueText,
    onInput: value => setChannel('h', value),
    onSettle: () => announceNow(descriptionSummary()),
  }),
}

const shiftValueText = (value: number): string => `${Math.round(value * 100)}% ${hoverDirection($textColor.get())}`

const shiftSlider = createSlider({
  thumb: byId('shift-slider'), track: byId('shift-track'), min: 0, max: 0.2, step: 0.01, bigStep: 0.05,
  valueText: shiftValueText,
  onInput: value => $shift.set(value),
  onSettle: () => announceNow(hoverSummary()),
})

const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-x]'))

for (const canvas of canvases.filter(c => c.dataset.y)) {
  canvas.addEventListener('click', event => {
    if (!$editable.get()) return
    const picked = pickFromChart(canvas, event)
    const next = { ...$color.get() }
    for (const [channel, value] of Object.entries(picked) as [Channel, number][]) {
      next[channel] = clampChannel(channel, value)
    }
    $color.set(next)
    syncSliders(next)
    scheduleAnnouncement(descriptionSummary)
  })
}

function syncSliders(color: Oklch): void {
  sliders.l.set(color.l)
  sliders.c.set(color.c)
  sliders.h.set(color.h)
}

let frame = 0
function redrawCharts(color: Oklch): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => canvases.forEach(canvas => drawSlice(canvas, color)))
}

function renderVerdict(prefix: string, check: TextCheck): void {
  const wcagIcon = byId(`${prefix}wcag-icon`)
  wcagIcon.textContent = check.wcagPasses ? '✓' : '✗'
  wcagIcon.classList.toggle('badge-success', check.wcagPasses)
  wcagIcon.classList.toggle('badge-error', !check.wcagPasses)
  byId(`${prefix}wcag-text`).textContent = check.wcagText
  const apcaIcon = byId(`${prefix}apca-icon`)
  apcaIcon.textContent = check.readsWell ? '✓' : '✗'
  apcaIcon.classList.toggle('badge-success', check.readsWell)
  apcaIcon.classList.toggle('badge-error', !check.readsWell)
  byId(`${prefix}apca-text`).textContent = `${check.apcaText}.`
  byId(`${prefix}apca-lc`).textContent = `APCA Lc ${Math.round(check.lc)}`
}

function paintSample(id: string, background: string): void {
  const { color, size, weight } = $style.get()
  const sample = byId(id)
  sample.style.background = background
  sample.style.color = color === 'white' ? '#fff' : '#000'
  sample.style.fontSize = `${size / 16}rem`
  sample.style.fontWeight = String(weight)
}

$color.subscribe(color => {
  const hex = toHex(color)
  byId('swatch').style.background = hex
  byId('description').textContent = describeColor(color)
  byId('oklch-text').textContent = `${formatOklch(color)} · ${hex}`
  byId('l-value').textContent = `${Math.round(color.l * 100)}%`
  byId('c-value').textContent = chromaValueText(color.c)
  byId('h-value').textContent = `${hueName(color.h)}, ${Math.round(color.h) % 360}°`
  byId('l-hint').textContent = LIGHTNESS_HINT
  byId('c-hint').textContent = CHROMA_HINT
  byId('h-hint').textContent = hueHint(color.h)
  byId('normal-hex').textContent = hex
  redrawCharts(color)
})

$check.subscribe(check => {
  renderVerdict('', check)
  renderVerdict('normal-', check)
  paintSample('sample', toHex($color.get()))
  paintSample('normal-sample', toHex($color.get()))
})

$hoverCheck.subscribe(check => {
  renderVerdict('hover-', check)
  const hex = toHex($hover.get())
  byId('hover-hex').textContent = hex
  paintSample('hover-sample', hex)
})

$shift.subscribe(shift => {
  byId('shift-value').textContent = shiftValueText(shift)
})

$textColor.subscribe(text => {
  byId('shift-hint').textContent = text === 'white'
    ? 'Darker, because the text is white'
    : 'Lighter, because the text is black'
  byId('shift-value').textContent = shiftValueText($shift.get())
  shiftSlider.set($shift.get())
})

$css.subscribe(css => {
  byId('css-code').textContent = css
  byId('copy-status').hidden = true
})

syncSliders($color.get())
shiftSlider.set($shift.get())

const textColorInputs = document.querySelectorAll<HTMLInputElement>('input[name="text-color"]')
const fontSizeInput = byId<HTMLInputElement>('font-size')
const fontWeightSelect = byId<HTMLSelectElement>('font-weight')

for (const input of textColorInputs) {
  input.addEventListener('change', () => {
    $textColor.set(input.value as TextColor)
    scheduleAnnouncement(colorSummary)
  })
}

fontSizeInput.addEventListener('input', () => {
  const size = Number(fontSizeInput.value)
  if (!Number.isFinite(size) || size <= 0) return
  $fontSize.set(size)
  scheduleAnnouncement(colorSummary)
})

fontWeightSelect.addEventListener('change', () => {
  $fontWeight.set(Number(fontWeightSelect.value))
  scheduleAnnouncement(colorSummary)
})

byId('recommend').addEventListener('click', () => {
  const result = recommend(toRgb($color.get()))
  const box = byId('recommendation')
  box.hidden = false
  if (!result) {
    byId('recommendation-title').textContent = NO_RECOMMENDATION
    byId('recommendation-text').textContent = ''
    announceNow([NO_RECOMMENDATION])
    return
  }
  const { color, size, weight } = result.style
  for (const input of textColorInputs) input.checked = input.value === color
  fontSizeInput.value = String(size)
  fontWeightSelect.value = String(weight)
  $textColor.set(color)
  $fontSize.set(size)
  $fontWeight.set(weight)
  byId('recommendation-title').textContent = result.title
  byId('recommendation-text').textContent = result.explanation
  const check = $check.get()
  announceNow([`Recommended: ${lowerFirst(textPair(result.style))}. ${result.explanation}`, ...verdicts(check)])
})

byId('copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($css.get())
  byId('copy-status').hidden = false
  announceNow(['CSS copied'])
})

for (const input of document.querySelectorAll<HTMLInputElement>('input[name="source"]')) {
  input.addEventListener('change', () => {
    $source.set(input.value as ColorSource)
    if (input.value === 'pick') announceNow([`Current color: ${describeColor($color.get())}. Change it with the sliders below.`])
    if (input.value === 'given') {
      const original = $original.get()
      if (original) {
        $color.set(original)
        syncSliders(original)
      }
    }
  })
}


$editable.subscribe(editable => {
  if (editable) byId('panels').removeAttribute('aria-hidden')
  else byId('panels').setAttribute('aria-hidden', 'true')
  for (const channel of ['l', 'c', 'h']) {
    byId(`${channel}-track`).hidden = !editable
    byId(`${channel}-hint`).hidden = !editable
  }
  for (const canvas of canvases.filter(c => c.dataset.y)) canvas.classList.toggle('cursor-crosshair', editable)
})

$source.subscribe(source => {
  byId('brand-field').hidden = source !== 'given'
  const view = byId('color-view')
  const summary = byId('color-summary')
  if (source === 'given') view.prepend(summary)
  else view.append(summary)
})

$hasColor.subscribe(hasColor => {
  for (const note of document.querySelectorAll<HTMLElement>('.needs-color-note')) note.hidden = hasColor
  for (const body of document.querySelectorAll<HTMLElement>('.step-body')) body.hidden = !hasColor
  byId('color-view').hidden = !hasColor
})

const textStep = document.querySelector<HTMLElement>('section[aria-labelledby="step-2-title"]')!
textStep.addEventListener('focusin', event => {
  if (textStep.contains(event.relatedTarget as Node | null)) return
  setTimeout(() => {
    if (textStep.contains(document.activeElement)) announceNow(colorSummary())
  }, SETTLE_DELAY)
})
