import { type ReactNode } from 'react'
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar'

export interface ToolbarProps {
  /**
   * The content of the toolbar (typically ToolbarButton components)
   */
  children: ReactNode
  /**
   * Optional brand/title to display on the left side
   */
  brand?: ReactNode
  /**
   * Additional CSS class name
   */
  className?: string
  /**
   * Accessible label for the toolbar
   */
  ariaLabel?: string
}

/**
 * Toolbar component for displaying action buttons and controls.
 * Built on Base UI Toolbar for accessibility.
 * 
 * @example
 *
 * ```tsx
 * <Toolbar brand="My App" ariaLabel="Main actions">
 *   <ToolbarButton icon={<SaveIcon />} onClick={handleSave}>Save</ToolbarButton>
 *   <ToolbarButton icon={<OpenIcon />} onClick={handleOpen}>Open</ToolbarButton>
 * </Toolbar>
 * ```
 */
export const Toolbar = ({ children, brand, className = '', ariaLabel = 'Actions' }: ToolbarProps) => {
  return (
    <header className={`toolbar ${className}`.trim()}>
      {brand && <div className="brand">{brand}</div>}
      <BaseToolbar.Root className="actions" aria-label={ariaLabel}>
        {children}
      </BaseToolbar.Root>
    </header>
  )
}
