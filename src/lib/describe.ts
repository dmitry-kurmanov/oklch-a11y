import { ISCC_NBS } from './iscc-nbs.ts'
import { hexToOklab, inSrgb, maxChroma, toHex, type Oklch } from './oklch.ts'

const HUE_ANCHORS: [string, number][] = [
  ['red', 29],
  ['orange', 53],
  ['yellow', 110],
  ['green', 142],
  ['cyan', 195],
  ['blue', 264],
  ['purple', 328],
  ['pink', 352],
]

const GREY_CHROMA = 0.02

export function chromaWord(c: number): string {
  if (c < GREY_CHROMA) return 'grey'
  if (c < 0.06) return 'greyish'
  if (c < 0.12) return 'soft'
  if (c < 0.18) return 'strong'
  return 'vivid'
}

function neighbours(h: number): { below: [string, number]; above: [string, number]; t: number } {
  const hue = ((h % 360) + 360) % 360
  for (let i = 0; i < HUE_ANCHORS.length; i++) {
    const below = HUE_ANCHORS[i]
    const above = HUE_ANCHORS[(i + 1) % HUE_ANCHORS.length]
    const span = (above[1] - below[1] + 360) % 360
    const offset = (hue - below[1] + 360) % 360
    if (offset < span) return { below, above, t: offset / span }
  }
  return { below: HUE_ANCHORS[0], above: HUE_ANCHORS[1], t: 0 }
}

export function hueParts(h: number): string[] {
  const { below, above, t } = neighbours(h)
  if (t < 1 / 3) return [below[0]]
  if (t > 2 / 3) return [above[0]]
  return [below[0], above[0]]
}

export function hueName(h: number): string {
  return hueParts(h).join('-')
}

export function isWarm(h: number): boolean {
  return h <= 110 || h >= 330
}

export function lightnessPercent(l: number): number {
  return Math.round(l * 100)
}

const CENTROID_LABS = ISCC_NBS.map(({ name, hex }) => ({ name, lab: hexToOklab(hex) }))

export function standardName(color: Oklch): string {
  const [l, a, b] = hexToOklab(toHex(color))
  let best = CENTROID_LABS[0]
  let bestDistance = Infinity
  for (const centroid of CENTROID_LABS) {
    const distance = (centroid.lab[0] - l) ** 2 + (centroid.lab[1] - a) ** 2 + (centroid.lab[2] - b) ** 2
    if (distance < bestDistance) {
      best = centroid
      bestDistance = distance
    }
  }
  return best.name
}

export function describeColor(color: Oklch): string {
  const { c, h } = color
  const words = c < GREY_CHROMA
    ? ['grey']
    : [chromaWord(c), isWarm(h) ? 'warm' : 'cool', hueName(h)]
  const phrase = words.join(' ')
  return `${phrase[0].toUpperCase()}${phrase.slice(1)} (${standardName(color)})`
}

export function lightnessValueText(l: number): string {
  return `${lightnessPercent(l)}% lightness`
}

export function chromaValueText(c: number): string {
  return `${chromaWord(c)}, ${Math.round(c * 1000) / 1000}`
}

export function hueValueText(h: number): string {
  return `${hueName(h)}, ${Math.round(h) % 360} degrees`
}

export function hueHint(h: number): string {
  const parts = hueParts(h)
  if (parts.length === 2) return `left — more ${parts[0]}, right — more ${parts[1]}`
  const index = HUE_ANCHORS.findIndex(([name]) => name === parts[0])
  const left = HUE_ANCHORS[(index - 1 + HUE_ANCHORS.length) % HUE_ANCHORS.length][0]
  const right = HUE_ANCHORS[(index + 1) % HUE_ANCHORS.length][0]
  return `left — more ${left}, right — more ${right}`
}

export const LIGHTNESS_HINT = 'left — darker, right — lighter'
export const CHROMA_HINT = 'left — greyer, right — more vivid'

function nearestLightness(color: Oklch, direction: 1 | -1): number | null {
  const start = Math.round(color.l * 100)
  for (let percent = start + direction; percent >= 0 && percent <= 100; percent += direction) {
    if (inSrgb({ ...color, l: percent / 100 })) return percent
  }
  return null
}

function nearestHue(color: Oklch, direction: 1 | -1): number | null {
  const start = Math.round(color.h)
  for (let step = 1; step < 180; step++) {
    const hue = (((start + direction * step) % 360) + 360) % 360
    if (inSrgb({ ...color, h: hue })) return hue
  }
  return null
}

function listOptions(options: string[]): string {
  if (options.length < 2) return options.join('')
  return `${options.slice(0, -1).join(', ')}, or ${options[options.length - 1]}`
}

export function screenRangeAdvice(color: Oklch): string {
  const options = [`lower chroma to ${(Math.floor(maxChroma(color.l, color.h) * 100) / 100).toFixed(2)}`]
  const darker = nearestLightness(color, -1)
  const lighter = nearestLightness(color, 1)
  if (darker !== null) options.push(`lower lightness to ${darker}%`)
  if (lighter !== null) options.push(`raise lightness to ${lighter}%`)
  const hues = [nearestHue(color, -1), nearestHue(color, 1)].filter((hue): hue is number => hue !== null)
  const hueTargets = [...new Set(hues)].map(hue => `${hue}° (${hueName(hue)})`)
  if (hueTargets.length > 0) options.push(`move hue to ${hueTargets.join(' or ')}`)
  const sentence = listOptions(options)
  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`
}
