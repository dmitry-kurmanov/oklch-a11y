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
