import type { ThemeDefinition, ThemeRegistry } from '@sessionry/plugin-api'

class ThemeRegistryImpl implements ThemeRegistry {
  private themes = new Map<string, ThemeDefinition>()
  private pluginThemes = new Map<string, Set<string>>() // pluginId -> themeIds
  
  registerThemes(pluginId: string, themes: ThemeDefinition[]): void {
    const themeIds = new Set<string>()
    
    for (const theme of themes) {
      if (this.themes.has(theme.id)) {
        console.warn(`[ThemeRegistry] Theme "${theme.id}" is already registered, skipping`)
        continue
      }
      
      this.themes.set(theme.id, theme)
      themeIds.add(theme.id)
      console.log(`[ThemeRegistry] Registered theme: ${theme.id} (${theme.name}) from plugin: ${pluginId}`)
    }
    
    if (themeIds.size > 0) {
      this.pluginThemes.set(pluginId, themeIds)
    }
  }
  
  unregisterThemes(pluginId: string): void {
    const themeIds = this.pluginThemes.get(pluginId)
    if (!themeIds) return
    
    for (const themeId of themeIds) {
      this.themes.delete(themeId)
      console.log(`[ThemeRegistry] Unregistered theme: ${themeId} from plugin: ${pluginId}`)
    }
    
    this.pluginThemes.delete(pluginId)
  }
  
  getTheme(themeId: string): ThemeDefinition | undefined {
    return this.themes.get(themeId)
  }
  
  getAllThemes(): ThemeDefinition[] {
    return Array.from(this.themes.values())
  }
  
  getThemeIds(): string[] {
    return Array.from(this.themes.keys())
  }
  
  hasTheme(themeId: string): boolean {
    return this.themes.has(themeId)
  }
}

export const themeRegistry = new ThemeRegistryImpl()
