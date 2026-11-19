export function debounce(fn: () => void, delay: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, delay)
  }
}
