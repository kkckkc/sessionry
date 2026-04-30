/**
 * @sessionry/design-tokens
 * 
 * Design tokens and CSS variables for the Sessionry design system.
 * 
 * Usage:
 * ```typescript
 * // Import all tokens
 * import '@sessionry/design-tokens/tokens.css'
 * import '@sessionry/design-tokens/context.css'
 * import '@sessionry/design-tokens/base.css'
 * ```
 */

// Re-export CSS files for convenience
export const tokens = './tokens.css'
export const context = './context.css'
export const base = './base.css'

// Type definitions for design tokens (for future programmatic access)
export interface ColorTokens {
  // Raw palette
  windowBg: string
  chromeBg: string
  sidebarBg: string
  workspaceBg: string
  workspaceBg2: string
  
  // Panel backgrounds
  panelBg: string
  panelBgSoft: string
  panelBgStrong: string
  
  // Borders
  borderColor: string
  borderSubtle: string
  
  // Text
  textPrimary: string
  textSecondary: string
  textTertiary: string
  
  // Accent
  accent: string
  accentBg: string
  accentBorder: string
  
  // Interactive
  buttonBg: string
  buttonBgHover: string
  
  // Elevation
  shadow: string
}

export interface ContextTokens {
  ctxBg: string
  ctxBtnBg: string
  ctxBtnHover: string
  ctxTabBg: string
  ctxTabHoverBg: string
  ctxBorder: string
}

export interface DesignTokens {
  colors: ColorTokens
  context: ContextTokens
}

// Note: Actual token values are defined in CSS custom properties
// This TypeScript interface is for type safety when building theme plugins
