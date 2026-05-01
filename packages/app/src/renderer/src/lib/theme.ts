import type { AppTheme } from '@sessionry/plugin-api'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

export const applyTheme = (theme: AppTheme) => {
  const isDark = theme === 'dark' || (theme === 'system' && darkQuery.matches)
  document.documentElement.classList.toggle('theme-dark', isDark)
  document.documentElement.classList.toggle('theme-light', !isDark)
}

export const watchSystemTheme = (getTheme: () => AppTheme) => {
  const listener = () => {
    if (getTheme() === 'system') applyTheme('system')
  }
  darkQuery.addEventListener('change', listener)
  return () => darkQuery.removeEventListener('change', listener)
}
