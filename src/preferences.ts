const THEME_KEY = 'theme'
const LARGE_VIEW_KEY = 'large-view'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

export function initPreferences(themeToggle: HTMLInputElement, largeViewButton: HTMLElement): void {
  const root = document.documentElement
  const stored = read(THEME_KEY)
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches
  if (stored) root.dataset.theme = stored
  themeToggle.checked = stored ? stored === 'dark' : systemDark
  themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'dark' : 'light'
    root.dataset.theme = theme
    write(THEME_KEY, theme)
  })

  function applyLargeView(on: boolean): void {
    root.classList.toggle('large-view', on)
    largeViewButton.setAttribute('aria-pressed', String(on))
  }
  applyLargeView(read(LARGE_VIEW_KEY) === 'true')
  largeViewButton.addEventListener('click', () => {
    const on = largeViewButton.getAttribute('aria-pressed') !== 'true'
    applyLargeView(on)
    write(LARGE_VIEW_KEY, String(on))
  })
}
