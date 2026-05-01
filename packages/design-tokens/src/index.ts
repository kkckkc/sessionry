/**
 * @sessionry/design-tokens
 *
 * Design tokens and CSS variables for the Sessionry design system.
 *
 * Usage:
 * ```typescript
 * // Import the canonical theme entrypoint
 * import '@sessionry/design-tokens/theme.css'
 * ```
 */

// Re-export CSS files for convenience
export const theme = './theme.css'
export const tokens = './tokens.css'
export const context = './context.css'
export const base = './base.css'

// Type definitions for design tokens (for future programmatic access)
export interface ColorTokens {
  // Raw palette
  windowBg: string
  chromeBg: string
  surfaceHigh: string
  sidebarBg: string
  workspaceBg: string
  workspaceBg2: string
  canvasBg: string

  // Panel backgrounds
  panelBg: string
  panelBgSoft: string
  panelBgStrong: string

  // Borders
  borderColor: string
  borderStrong: string
  borderSubtle: string

  // Text
  textPrimary: string
  textSecondary: string
  textTertiary: string

  // Accent
  accent: string
  accentBg: string
  accentBorder: string

  // Status / Semantic
  danger: string
  dangerBg: string
  success: string
  successBg: string
  warning: string
  warningBg: string

  // Input
  inputBg: string
  inputBorder: string

  // Badge
  badgeBg: string
  badgeText: string

  // Terminal
  termPrompt: string
  termPath: string

  // Interactive
  buttonBg: string
  buttonBgHover: string
}

export interface ShadowTokens {
  shadowSm: string
  shadowMd: string
  shadowLg: string
  shadowXl: string
  shadow: string // backward-compat alias for shadowXl
}

export interface SpacingTokens {
  space1: string
  space2: string
  space3: string
  space4: string
  space5: string
  space6: string
  space7: string
  space8: string
  space9: string
}

export interface RadiusTokens {
  radius1: string
  radius2: string
  radius3: string
  radius4: string
  radius5: string
  radius6: string
  radius7: string
  radius8: string
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
  shadows: ShadowTokens
  spacing: SpacingTokens
  radii: RadiusTokens
  context: ContextTokens
}

// Note: Actual token values are defined in CSS custom properties
// This TypeScript interface is for type safety when building theme plugins
