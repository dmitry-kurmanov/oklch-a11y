import type { Rgb } from './oklch.ts'

export type TextColor = 'white' | 'black'

export interface TextStyle {
  color: TextColor
  size: number
  weight: number
}

export const TEXT_RGB: Record<TextColor, Rgb> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
}

export const REGULAR = { size: 16, weight: 600 }
export const LARGE_BOLD = { size: 19, weight: 700 }

const WCAG_NORMAL = 4.5
const WCAG_LARGE = 3

function wcagLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(v => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function wcagRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [wcagLuminance(a), wcagLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const APCA_98G = {
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scale: 1.14,
  loOffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
}

function apcaY([r, g, b]: Rgb): number {
  const y = 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4
  return y > APCA_98G.blkThrs ? y : y + (APCA_98G.blkThrs - y) ** APCA_98G.blkClmp
}

export function apcaLc(text: Rgb, background: Rgb): number {
  const k = APCA_98G
  const textY = apcaY(text)
  const bgY = apcaY(background)
  if (Math.abs(bgY - textY) < k.deltaYmin) return 0
  if (bgY > textY) {
    const sapc = (bgY ** k.normBG - textY ** k.normTXT) * k.scale
    return sapc < k.loClip ? 0 : (sapc - k.loOffset) * 100
  }
  const sapc = (bgY ** k.revBG - textY ** k.revTXT) * k.scale
  return sapc > -k.loClip ? 0 : (sapc + k.loOffset) * 100
}

export function isLargeText(size: number, weight: number): boolean {
  return size >= 24 || (size >= 18.66 && weight >= 700)
}

export function apcaNeed(size: number, weight: number): number {
  if (isLargeText(size, weight)) return 45
  if (size < 16 || weight < 400) return 75
  return 60
}

export function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 100) / 100
  const crossesNorm = [WCAG_LARGE, WCAG_NORMAL].some(norm => ratio < norm && rounded >= norm)
  return (crossesNorm ? Math.floor(ratio * 100) / 100 : rounded).toFixed(2)
}

export interface TextCheck {
  ratio: number
  wcagNeed: number
  wcagPasses: boolean
  lc: number
  apcaNeed: number
  readsWell: boolean
  wcagText: string
  apcaText: string
}

export function checkText(background: Rgb, style: TextStyle): TextCheck {
  const text = TEXT_RGB[style.color]
  const ratio = wcagRatio(text, background)
  const large = isLargeText(style.size, style.weight)
  const need = large ? WCAG_LARGE : WCAG_NORMAL
  const passes = ratio >= need
  const shown = `${formatRatio(ratio)}:1 (needs ${need}:1)`
  let wcagText: string
  if (!passes) {
    wcagText = !large && ratio >= WCAG_LARGE
      ? `Fails WCAG AA, ${shown}. Try large bold text.`
      : `Fails WCAG AA, ${shown}.`
  } else {
    wcagText = large && ratio < WCAG_NORMAL
      ? `Large text only. Passes WCAG AA, ${shown}.`
      : `Passes WCAG AA, ${shown}.`
  }
  const lc = Math.abs(apcaLc(text, background))
  const lcNeed = apcaNeed(style.size, style.weight)
  const readsWell = lc >= lcNeed
  return {
    ratio,
    wcagNeed: need,
    wcagPasses: passes,
    lc,
    apcaNeed: lcNeed,
    readsWell,
    wcagText,
    apcaText: readsWell ? 'Reads well' : 'Hard to read',
  }
}

export interface Recommendation {
  style: TextStyle
  readsWell: boolean
  title: string
  explanation: string
}

const WEIGHT_NAMES: Record<number, string> = {
  100: 'thin', 200: 'extra light', 300: 'light', 400: 'regular', 500: 'medium',
  600: 'semibold', 700: 'bold', 800: 'extra bold', 900: 'black',
}

export function weightName(weight: number): string {
  return WEIGHT_NAMES[weight] ?? String(weight)
}

export function recommend(background: Rgb): Recommendation | null {
  const candidates = (['white', 'black'] as const).flatMap(color => [
    { color, ...REGULAR },
    { color, ...LARGE_BOLD },
  ]).map(style => ({ style, check: checkText(background, style) }))

  const passing = candidates.filter(c => c.check.wcagPasses)
  if (passing.length === 0) return null

  const readable = passing.filter(c => c.check.readsWell)
  const pool = readable.length > 0 ? readable : passing
  const best = pool.slice().sort((a, b) => {
    const aRegular = a.style.size === REGULAR.size ? 0 : 1
    const bRegular = b.style.size === REGULAR.size ? 0 : 1
    return readable.length > 0 && aRegular !== bRegular ? aRegular - bRegular : b.check.lc - a.check.lc
  })[0]

  const { color, size, weight } = best.style
  const title = `Recommended: ${color}, ${size}px, ${weightName(weight)} (${weight})`
  let explanation: string
  if (readable.length === 0) {
    explanation = 'Passes WCAG, but no option reads well on this background.'
  } else if (size === LARGE_BOLD.size) {
    explanation = 'Mid-lightness background: only large text reaches the contrast.'
  } else if (color === 'white') {
    explanation = 'Dark background: white text reads well at any size.'
  } else {
    explanation = 'Light background: black text reads well at any size.'
  }
  return { style: best.style, readsWell: readable.length > 0, title, explanation }
}

export const NO_RECOMMENDATION = 'No text color passes WCAG AA on this background.'
