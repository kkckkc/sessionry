import type { AppPlugin } from '@sessionry/plugin-api'
import { defaultTheme } from './themes/default'
import { draculaTheme } from './themes/dracula'
import { oneDarkTheme } from './themes/one-dark'
import { solarizedDarkTheme } from './themes/solarized-dark'
import { githubDarkTheme } from './themes/github-dark'

export const defaultThemesPlugin: AppPlugin = {
  id: 'default-themes',
  name: 'Default Themes',
  
  themes: [
    defaultTheme,
    draculaTheme,
    oneDarkTheme,
    solarizedDarkTheme,
    githubDarkTheme
  ]
}

export default defaultThemesPlugin
