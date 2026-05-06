import type { AppTheme, ThemeId } from '@sessionry/plugin-api';

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

export const applyTheme = (theme: AppTheme) => {
  const isDark = theme === 'dark' || (theme === 'system' && darkQuery.matches);
  document.documentElement.classList.toggle('theme-dark', isDark);
  document.documentElement.classList.toggle('theme-light', !isDark);
};

/**
 * Applies the color theme by setting the data-theme attribute.
 * Themes are now provided by plugins and fetched from the theme registry.
 */
export const applyColorTheme = (themeId: ThemeId, bgOverride: boolean, bgColor: string) => {
  document.documentElement.setAttribute('data-theme', themeId);

  if (bgOverride && bgColor) {
    document.documentElement.style.setProperty('--terminal-surface-bg', bgColor);
  } else {
    document.documentElement.style.removeProperty('--terminal-surface-bg');
  }
};

export const watchSystemTheme = (getTheme: () => AppTheme) => {
  const listener = () => {
    if (getTheme() === 'system') applyTheme('system');
  };
  darkQuery.addEventListener('change', listener);
  return () => darkQuery.removeEventListener('change', listener);
};
