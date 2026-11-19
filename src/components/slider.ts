import { debounce } from '../lib/debounce.ts'

export interface SliderOptions {
  thumb: HTMLElement
  track: HTMLElement
  min: number
  max: number
  step: number
  bigStep: number
  wrap?: boolean
  valueText: (value: number) => string
  onInput: (value: number) => void
  onSettle: (value: number) => void
}

export interface Slider {
  set: (value: number) => void
}

export const SETTLE_DELAY = 500

export function createSlider(options: SliderOptions): Slider {
  const { thumb, track, min, max, step, bigStep, wrap } = options
  const decimals = String(step).split('.')[1]?.length ?? 0
  let value = min

  thumb.setAttribute('aria-valuemin', String(min))
  thumb.setAttribute('aria-valuemax', String(max))

  function normalize(next: number): number {
    const span = max - min + (wrap ? step : 0)
    const wrapped = wrap ? ((((next - min) % span) + span) % span) + min : Math.min(max, Math.max(min, next))
    return Number(wrapped.toFixed(decimals))
  }

  function place(): void {
    thumb.style.left = `${((value - min) / (max - min)) * 100}%`
  }

  function syncAria(): void {
    thumb.setAttribute('aria-valuenow', String(value))
    thumb.setAttribute('aria-valuetext', options.valueText(value))
  }

  const settle = debounce(() => {
    syncAria()
    options.onSettle(value)
  }, SETTLE_DELAY)

  function change(next: number): void {
    const normalized = normalize(next)
    if (normalized === value) return
    value = normalized
    place()
    options.onInput(value)
    settle()
  }

  thumb.addEventListener('keydown', event => {
    const moves: Record<string, () => number> = {
      ArrowRight: () => value + step,
      ArrowUp: () => value + step,
      ArrowLeft: () => value - step,
      ArrowDown: () => value - step,
      PageUp: () => value + bigStep,
      PageDown: () => value - bigStep,
      Home: () => min,
      End: () => max,
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    change(move())
  })

  function fromPointer(event: PointerEvent): void {
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    change(Math.round((min + ratio * (max - min)) / step) * step)
  }

  track.addEventListener('pointerdown', event => {
    track.setPointerCapture(event.pointerId)
    thumb.focus()
    fromPointer(event)
  })
  track.addEventListener('pointermove', event => {
    if (track.hasPointerCapture(event.pointerId)) fromPointer(event)
  })

  return {
    set(next) {
      value = normalize(next)
      place()
      syncAria()
    },
  }
}
