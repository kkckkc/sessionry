/**
 * Font detection utilities for the renderer process
 * Uses the browser's queryLocalFonts API and canvas-based monospace detection
 */

export interface FontInfo {
  family: string;
  displayName: string;
}

/**
 * Detects if a font is monospace by measuring character widths
 * Monospace fonts have the same width for all characters
 */
function isMonospace(fontFamily: string): boolean {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Test with characters that have very different widths in proportional fonts
  const testChars = ['i', 'l', 'W', 'M', 'm', '1', '@'];
  ctx.font = `16px "${fontFamily}"`;

  const widths = testChars.map(c => ctx.measureText(c).width);
  const firstWidth = widths[0];

  // All widths should be identical in a monospace font
  // Allow tiny floating point differences (< 0.1px)
  return widths.every(w => Math.abs(w - firstWidth) < 0.1);
}

/**
 * Gets available monospace fonts using the browser's queryLocalFonts API
 * Falls back to common fonts if the API is unavailable
 */
export async function getMonospaceFonts(): Promise<FontInfo[]> {
  const fonts: FontInfo[] = [];

  try {
    // Check if queryLocalFonts is available (Chromium 103+)
    if ('queryLocalFonts' in window) {
      const availableFonts = await (window as any).queryLocalFonts();
      
      // Get unique font families
      const uniqueFamilies = new Set<string>();
      for (const font of availableFonts) {
        if (font.family) {
          uniqueFamilies.add(font.family);
        }
      }

      // Test each unique family for monospace
      for (const family of uniqueFamilies) {
        if (isMonospace(family)) {
          // Clip font name if longer than 30 characters
          const displayName = family.length > 30 ? `${family.slice(0, 27)}...` : family;
          fonts.push({
            family,
            displayName
          });
        }
      }

      // Sort alphabetically
      fonts.sort((a, b) => a.family.localeCompare(b.family));
    } else {
      console.warn('[FontDetection] queryLocalFonts API not available, using fallback');
      // Fall back to IPC-based detection
      return window.terminalApp.fonts.getMonospaceFonts();
    }
  } catch (error) {
    console.error('[FontDetection] Error detecting fonts:', error);
    // Fall back to IPC-based detection
    return window.terminalApp.fonts.getMonospaceFonts();
  }

  // Always include generic fallbacks at the end
  fonts.push(
    { family: 'ui-monospace', displayName: 'UI Monospace (System)' },
    { family: 'monospace', displayName: 'Monospace (Generic)' }
  );

  return fonts;
}
