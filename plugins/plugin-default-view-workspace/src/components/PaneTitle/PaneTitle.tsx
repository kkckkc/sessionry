import { type ReactNode } from 'react';

export interface PaneTitleProps {
  /**
   * The title text to display
   */
  title?: string;
  /**
   * Optional actions to display on the right side
   */
  actions?: ReactNode;
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Optional click handler for the title area
   */
  onClick?: () => void;
  /**
   * Whether the pane has unsaved changes
   */
  isDirty?: boolean;
}

/**
 * PaneTitle component for displaying a title bar at the top of a pane.
 * Always visible and pushes pane content down.
 *
 * @example
 *
 * ```tsx
 * <PaneTitle
 *   title="Terminal"
 *   onClick={handleFocus}
 *   actions={
 *     <>
 *       <button onClick={handleSplit}>Split</button>
 *       <button onClick={handleClose}>Close</button>
 *     </>
 *   }
 * />
 * ```
 */
export const PaneTitle = ({
  title,
  actions,
  className = '',
  onClick,
  isDirty = false
}: PaneTitleProps) => {
  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if clicking the title area, not the actions
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains('pane-title-text')
    ) {
      onClick?.();
    }
  };

  return (
    <header className={`pane-title ${className}`.trim()} onClick={handleClick}>
      {title && (
        <span className="pane-title-text">
          {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: Dirty indicator with aria-label for screen readers */}
          {isDirty && <span className="pane-title-dirty-indicator" aria-label="Unsaved changes" />}
          {title}
        </span>
      )}
      {actions && (
        <div className="pane-title-actions" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </header>
  );
};
