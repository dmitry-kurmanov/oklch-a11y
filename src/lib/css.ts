import { isLargeText, type TextStyle } from './contrast.ts'
import { formatOklch, round, toHex, type Oklch } from './oklch.ts'

export function hoverColor(brand: Oklch, shift: number, text: TextStyle['color']): Oklch {
  const l = text === 'white' ? brand.l - shift : brand.l + shift
  return { ...brand, l: Math.min(1, Math.max(0, l)) }
}

export function hoverDirection(text: TextStyle['color']): 'darker' | 'lighter' {
  return text === 'white' ? 'darker' : 'lighter'
}

export interface CssInput {
  brand: Oklch
  given: boolean
  shift: number
  text: TextStyle
  needsLarge: boolean
}

function isMinimumLargeSize({ size, weight }: TextStyle): boolean {
  return weight >= 700 ? size === 19 : size === 24
}

export function buildCss({ brand, given, shift, text, needsLarge }: CssInput): string {
  const sign = text.color === 'white' ? '-' : '+'
  const hover = toHex(hoverColor(brand, shift, text.color))
  const sizeNote = needsLarge && isLargeText(text.size, text.weight) && isMinimumLargeSize(text)
    ? `${text.size}px, minimum for contrast`
    : `${text.size}px`
  const rows: [string, string][] = [
    [`--brand: ${formatOklch(brand)};`, given ? `${toHex(brand)}, given` : `≈ ${toHex(brand)}`],
    ['', ''],
    ['/* picked by the tool */', ''],
    [`--brand-hover: ${hover};`, ''],
    [`--brand-hover: oklch(from var(--brand) calc(l ${sign} ${round(shift, 3)}) c h);`, ''],
    [`--brand-text: ${text.color === 'white' ? '#fff' : '#000'};`, 'same on hover'],
    [`--brand-text-size: ${round(text.size / 16, 4)}rem;`, sizeNote],
    [`--brand-text-weight: ${text.weight};`, ''],
  ]
  const width = Math.max(...rows.map(([code]) => code.length)) + 2
  const body = rows
    .map(([code, note]) => (note ? `${code.padEnd(width)}/* ${note} */` : code))
    .map(line => (line ? `  ${line}` : ''))
    .join('\n')
  return `:root {\n${body}\n}`
}
