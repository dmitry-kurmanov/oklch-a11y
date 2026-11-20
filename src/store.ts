import { atom, computed } from 'nanostores'
import { checkText, REGULAR, type TextColor } from './lib/contrast.ts'
import { buildCss, hoverColor } from './lib/css.ts'
import { inSrgb, parseColor, toRgb, type Oklch } from './lib/oklch.ts'

export const EXAMPLE_COLOR = '#E63946'

export const $color = atom<Oklch>(parseColor(EXAMPLE_COLOR)!)
export type ColorSource = 'given' | 'pick'

export const $source = atom<ColorSource>('given')
export const $original = atom<Oklch | null>(null)
export const $hasColor = computed([$source, $original], (source, original) => source === 'pick' || original !== null)
export const $inGamut = computed($color, inSrgb)
export const $editable = computed($source, source => source === 'pick')
export const $textColor = atom<TextColor>('white')
export const $fontSize = atom(16)
export const $fontWeight = atom(400)
export const $shift = atom(0.04)

export const $style = computed([$textColor, $fontSize, $fontWeight], (color, size, weight) => ({ color, size, weight }))
export const $check = computed([$color, $style], (color, style) => checkText(toRgb(color), style))
export const $hover = computed([$color, $shift, $textColor], hoverColor)
export const $hoverCheck = computed([$hover, $style], (hover, style) => checkText(toRgb(hover), style))

export const $css = computed([$color, $source, $shift, $style], (brand, source, shift, text) => buildCss({
  brand,
  given: source === 'given',
  shift,
  text,
  needsLarge: !checkText(toRgb(brand), { color: text.color, ...REGULAR }).wcagPasses,
}))
