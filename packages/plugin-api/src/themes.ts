/**
 * Theme definition that plugins can register
 */
export interface ThemeDefinition {
  id: string
  name: string
  description?: string
  author?: string
  
  // Terminal ANSI colors (for xterm.js)
  ansi: {
    background: string
    foreground: string
    cursor: string
    selectionBackground: string
    black: string
    brightBlack: string
    red: string
    brightRed: string
    green: string
    brightGreen: string
    yellow: string
    brightYellow: string
    blue: string
    brightBlue: string
    magenta: string
    brightMagenta: string
    cyan: string
    brightCyan: string
    white: string
    brightWhite: string
  }
  
  // Semantic tokens for code editor (CodeMirror)
  syntax: {
    keyword: string
    function: string
    variable: string
    type: string
    constant: string
    string: string
    number: string
    comment: string
    operator: string
    punctuation: string
    tag: string
    attribute: string
    property: string
    class: string
    interface: string
    namespace: string
    parameter: string
    decorator: string
    regexp: string
    escape: string
    link: string
    heading: string
    emphasis: string
    strong: string
    deleted: string
    inserted: string
    invalid: string
  }
}

/**
 * Theme registry for managing themes from all plugins
 */
export interface ThemeRegistry {
  /**
   * Register themes from a plugin
   */
  registerThemes(pluginId: string, themes: ThemeDefinition[]): void
  
  /**
   * Unregister all themes from a plugin
   */
  unregisterThemes(pluginId: string): void
  
  /**
   * Get a theme by ID
   */
  getTheme(themeId: string): ThemeDefinition | undefined
  
  /**
   * Get all registered themes
   */
  getAllThemes(): ThemeDefinition[]
  
  /**
   * Get all theme IDs
   */
  getThemeIds(): string[]
  
  /**
   * Check if a theme exists
   */
  hasTheme(themeId: string): boolean
}
