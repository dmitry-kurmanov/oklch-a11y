import { describe, expect, it } from 'vitest'
import { apcaLc, checkText, formatRatio, recommend, TEXT_RGB, wcagRatio } from './contrast.ts'
import { buildCss, hoverColor } from './css.ts'
import { chromaValueText, describeColor, hueHint, hueValueText, lightnessValueText, screenRangeAdvice } from './describe.ts'
import { formatOklch, inSrgb, maxChroma, parseColor, toHex, toRgb } from './oklch.ts'

const SPEC_COLORS = [
  { hex: '#E63946', oklch: 'oklch(61.2% 0.208 22.2)', white: [4.17, 73], black: [5.04, 37], rec: ['white', 19], hover: '#D7283A', hoverRatio: 4.94 },
  { hex: '#457B9D', oklch: 'oklch(56% 0.078 238)', white: [4.59, 77], black: [4.57, 32], rec: ['white', 16], hover: '#396F91', hoverRatio: 5.45 },
  { hex: '#2A9D8F', oklch: 'oklch(63% 0.101 183)', white: [3.32, 66], black: [6.32, 44], rec: ['white', 19], hover: '#149183', hoverRatio: 3.88 },
  { hex: '#1D3557', oklch: 'oklch(32.8% 0.068 257.3)', white: [12.36, 101], black: [1.7, 0], rec: ['white', 16], hover: '#132B4C', hoverRatio: 14.21 },
  { hex: '#FFD166', oklch: 'oklch(88% 0.135 86.1)', white: [1.44, 24], black: [14.56, 83], rec: ['black', 16], hover: '#FFDE74', hoverRatio: 15.95 },
  { hex: '#F1FAEE', oklch: 'oklch(97.5% 0.018 137.8)', white: [1.07, 0], black: [19.65, 101], rec: ['black', 16], hover: '#F9FFF6', hoverRatio: 20.66 },
] as const

describe('spec test colors (10.6)', () => {
  for (const spec of SPEC_COLORS) {
    describe(spec.hex, () => {
      const color = parseColor(spec.hex)!
      const rgb = toRgb(color)

      it('converts to the expected OKLCH', () => {
        expect(formatOklch(color)).toBe(spec.oklch)
      })

      it('gives the expected WCAG ratios and APCA Lc', () => {
        expect(wcagRatio(TEXT_RGB.white, rgb)).toBeCloseTo(spec.white[0], 1)
        expect(Math.abs(wcagRatio(TEXT_RGB.white, rgb) - spec.white[0])).toBeLessThanOrEqual(0.01)
        expect(Math.abs(wcagRatio(TEXT_RGB.black, rgb) - spec.black[0])).toBeLessThanOrEqual(0.01)
        expect(Math.abs(Math.round(Math.abs(apcaLc(TEXT_RGB.white, rgb))) - spec.white[1])).toBeLessThanOrEqual(1)
        expect(Math.abs(Math.round(Math.abs(apcaLc(TEXT_RGB.black, rgb))) - spec.black[1])).toBeLessThanOrEqual(1)
      })

      it('recommends the expected text', () => {
        const rec = recommend(rgb)!
        expect([rec.style.color, rec.style.size]).toEqual(spec.rec)
        expect(rec.readsWell).toBe(true)
      })

      it('gives the expected hover color and contrast', () => {
        const hover = hoverColor(color, 0.04, spec.rec[0])
        expect(toHex(hover)).toBe(spec.hover)
        expect(Math.abs(wcagRatio(TEXT_RGB[spec.rec[0]], toRgb(hover)) - spec.hoverRatio)).toBeLessThanOrEqual(0.01)
      })
    })
  }
})

describe('verdict texts (10.4)', () => {
  const red = toRgb(parseColor('#E63946')!)

  it('large text that passes only as large', () => {
    const check = checkText(red, { color: 'white', size: 19, weight: 700 })
    expect(check.wcagText).toBe('Large text only. Passes WCAG AA, 4.17:1 (needs 3:1).')
    expect(check.apcaText).toBe('Reads well')
  })

  it('regular text that would pass as large', () => {
    expect(checkText(red, { color: 'white', size: 16, weight: 600 }).wcagText)
      .toBe('Fails WCAG AA, 4.17:1 (needs 4.5:1). Try large bold text.')
  })

  it('formally passes but is hard to read', () => {
    const check = checkText(red, { color: 'black', size: 16, weight: 600 })
    expect(check.wcagText).toBe('Passes WCAG AA, 5.04:1 (needs 4.5:1).')
    expect(check.apcaText).toBe('Hard to read')
  })

  it('fails even as large text', () => {
    const yellow = toRgb(parseColor('#FFD166')!)
    expect(checkText(yellow, { color: 'white', size: 19, weight: 700 }).wcagText)
      .toBe('Fails WCAG AA, 1.44:1 (needs 3:1).')
  })

  it('does not round a failing ratio up to the norm', () => {
    expect(formatRatio(4.499)).toBe('4.49')
    expect(formatRatio(4.168)).toBe('4.17')
  })
})

describe('color words (10.2, 10.3)', () => {
  const red = parseColor('#E63946')!

  it('describes the color with the main word first', () => {
    expect(describeColor(red)).toBe('Vivid warm red (vivid reddish orange)')
    expect(describeColor(parseColor('#808080')!)).toBe('Grey (medium gray)')
    expect(describeColor(parseColor('#3E3A00')!)).toBe('Soft warm yellow (dark olive)')
  })

  it('gives slider value texts and hue hint', () => {
    expect(lightnessValueText(red.l)).toBe('61% lightness')
    expect(chromaValueText(red.c)).toBe('vivid, 0.208')
    expect(hueValueText(red.h)).toBe('red, 22 degrees')
    expect(hueHint(red.h)).toBe('left — more pink, right — more orange')
  })
})

describe('parsing (3.2)', () => {
  it('reads hex, rgb(), hsl() and oklch()', () => {
    for (const input of ['#E63946', 'rgb(230 57 70)', 'rgb(230, 57, 70)', 'oklch(61.2% 0.208 22.2)']) {
      expect(toHex(parseColor(input)!), input).toBe('#E63946')
    }
    expect(toHex(parseColor('hsl(355 78% 56%)')!)).toBe('#E63746')
  })

  it('rejects what it cannot read', () => {
    expect(parseColor('#E6394')).toBeNull()
    expect(parseColor('')).toBeNull()
    expect(parseColor('reddish')).toBeNull()
  })
})

describe('result CSS (3.9)', () => {
  it('matches the spec example', () => {
    expect(buildCss({
      brand: parseColor('#E63946')!,
      given: true,
      shift: 0.04,
      text: { color: 'white', size: 19, weight: 700 },
      needsLarge: true,
    })).toBe([
      ':root {',
      '  --brand: oklch(61.2% 0.208 22.2);                            /* #E63946, given */',
      '',
      '  /* picked by the tool */',
      '  --brand-hover: #D7283A;',
      '  --brand-hover: oklch(from var(--brand) calc(l - 0.04) c h);',
      '  --brand-text: #fff;                                          /* same on hover */',
      '  --brand-text-size: 1.1875rem;                                /* 19px, minimum for contrast */',
      '  --brand-text-weight: 700;',
      '}',
    ].join('\n'))
  })
})

describe('screen range (sRGB)', () => {
  it('finds the chroma limit for a dark yellow', () => {
    const limit = maxChroma(0.34, 105)
    expect(limit).toBeGreaterThan(0.06)
    expect(limit).toBeLessThan(0.09)
    expect(inSrgb({ l: 0.34, c: limit, h: 105 })).toBe(true)
  })

  it('reports a dark vivid yellow as outside sRGB', () => {
    expect(inSrgb({ l: 0.34, c: 0.37, h: 105 })).toBe(false)
    expect(inSrgb(parseColor('#E63946')!)).toBe(true)
  })
})

describe('screen range advice', () => {
  it('offers chroma and both hue directions when lightness cannot help', () => {
    expect(screenRangeAdvice({ l: 0.6, c: 0.22, h: 114 }))
      .toBe('Lower chroma to 0.13, or move hue to 33° (red) or 278° (blue).')
  })

  it('offers lightness when it brings the color back', () => {
    expect(screenRangeAdvice({ l: 0.5, c: 0.15, h: 105 }))
      .toBe('Lower chroma to 0.10, raise lightness to 71%, or move hue to 42° (red-orange) or 137° (green).')
  })
})
