import type { AppTheme, TerminalThemeName } from '@sessionry/plugin-api'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

export const applyTheme = (theme: AppTheme) => {
  const isDark = theme === 'dark' || (theme === 'system' && darkQuery.matches)
  document.documentElement.classList.toggle('theme-dark', isDark)
  document.documentElement.classList.toggle('theme-light', !isDark)
}

const TERMINAL_THEME_BACKGROUNDS: Partial<Record<TerminalThemeName, string>> = {
  dracula: '#282a36',
  'one-dark': '#282c34',
  'solarized-dark': '#002b36',
  'github-dark': '#0d1117'
}

export const applyTerminalTheme = (
  theme: TerminalThemeName,
  bgOverride: boolean,
  bgColor: string
) => {
  document.documentElement.setAttribute('data-terminal-theme', theme)
  const bg = bgOverride ? bgColor : TERMINAL_THEME_BACKGROUNDS[theme]
  if (bg) {
    document.documentElement.style.setProperty('--terminal-surface-bg', bg)
  } else {
    document.documentElement.style.removeProperty('--terminal-surface-bg')
  }
}

export const watchSystemTheme = (getTheme: () => AppTheme) => {
  const listener = () => {
    if (getTheme() === 'system') applyTheme('system')
  }
  darkQuery.addEventListener('change', listener)
  return () => darkQuery.removeEventListener('change', listener)
}
