import { colordx } from '@colordx/core'

export interface Oklch {
  l: number
  c: number
  h: number
}

export type Channel = keyof Oklch
export type Rgb = [number, number, number]

export const RANGE: Record<Channel, number> = { l: 1, c: 0.37, h: 360 }

export function oklchToLinearSrgb({ l, c, h }: Oklch): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}

const GAMUT_EPSILON = 1e-4

export function inSrgb(color: Oklch): boolean {
  return oklchToLinearSrgb(color).every(v => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON)
}

export function maxChroma(l: number, h: number): number {
  let low = 0
  let high = RANGE.c
  if (inSrgb({ l, c: high, h })) return high
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    if (inSrgb({ l, c: mid, h })) low = mid
    else high = mid
  }
  return low
}

export function encodeChannel(linear: number): number {
  const v = Math.min(1, Math.max(0, linear))
  return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055))
}

export function toRgb(color: Oklch): Rgb {
  const [r, g, b] = oklchToLinearSrgb(color)
  return [encodeChannel(r), encodeChannel(g), encodeChannel(b)]
}

export function toHex(color: Oklch): string {
  return '#' + toRgb(color).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map(i => {
    const s = parseInt(hex.slice(i, i + 2), 16) / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function parseColor(input: string): Oklch | null {
  const parsed = colordx(input.trim())
  if (!input.trim() || !parsed.isValid()) return null
  const { l, c, h } = parsed.toOklch()
  return { l, c, h: Number.isFinite(h) ? h : 0 }
}

export function formatOklch({ l, c, h }: Oklch): string {
  return `oklch(${round(l * 100, 1)}% ${round(c, 3)} ${round(h, 1)})`
}

export function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function clampChannel(channel: Channel, value: number): number {
  if (channel === 'h') return ((value % 360) + 360) % 360
  return Math.min(RANGE[channel], Math.max(0, value))
}
