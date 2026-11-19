const THEME_KEY = 'theme'

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

export function initPreferences(themeToggle: HTMLInputElement): void {
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
}
