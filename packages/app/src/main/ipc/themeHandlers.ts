import { ipcMain } from 'electron'
import { themeRegistry } from '../themeRegistry'

export function registerThemeHandlers(): void {
  ipcMain.handle('themes:get', (_event, themeId: string) => {
    return themeRegistry.getTheme(themeId)
  })
  
  ipcMain.handle('themes:getAll', () => {
    return themeRegistry.getAllThemes()
  })
  
  ipcMain.handle('themes:getIds', () => {
    return themeRegistry.getThemeIds()
  })
  
  console.log('[ThemeHandlers] Registered theme IPC handlers')
}
