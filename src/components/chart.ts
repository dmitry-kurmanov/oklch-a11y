import { encodeChannel, oklchToLinearSrgb, RANGE, type Channel, type Oklch } from '../lib/oklch.ts'

const GAMUT_EPSILON = 1e-4
const OUT_OF_GAMUT_ALPHA = 90

export function drawSlice(canvas: HTMLCanvasElement, color: Oklch): void {
  const x = canvas.dataset.x as Channel
  const y = canvas.dataset.y as Channel | undefined
  const { width, height } = canvas
  const context = canvas.getContext('2d')
  if (!context) return
  const image = context.createImageData(width, height)
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const point = { ...color }
      point[x] = (column / (width - 1)) * RANGE[x]
      if (y) point[y] = (1 - row / (height - 1)) * RANGE[y]
      const linear = oklchToLinearSrgb(point)
      const inGamut = linear.every(v => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON)
      if (!inGamut && y) continue
      const i = (row * width + column) * 4
      image.data[i] = encodeChannel(linear[0])
      image.data[i + 1] = encodeChannel(linear[1])
      image.data[i + 2] = encodeChannel(linear[2])
      image.data[i + 3] = inGamut ? 255 : OUT_OF_GAMUT_ALPHA
    }
  }
  context.putImageData(image, 0, 0)
  if (!y) return
  const px = Math.round((color[x] / RANGE[x]) * (width - 1)) + 0.5
  const py = Math.round((1 - color[y] / RANGE[y]) * (height - 1)) + 0.5
  context.strokeStyle = 'rgb(128 128 128 / 0.8)'
  context.beginPath()
  context.moveTo(px, 0)
  context.lineTo(px, height)
  context.moveTo(0, py)
  context.lineTo(width, py)
  context.stroke()
}

export function pickFromChart(canvas: HTMLCanvasElement, event: MouseEvent): Partial<Oklch> {
  const x = canvas.dataset.x as Channel
  const y = canvas.dataset.y as Channel
  const rect = canvas.getBoundingClientRect()
  const rx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const ry = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  return { [x]: rx * RANGE[x], [y]: (1 - ry) * RANGE[y] }
}
