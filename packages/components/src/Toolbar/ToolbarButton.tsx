import { type ReactNode } from 'react';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

export interface ToolbarButtonProps {
  /**
   * Button content (typically an icon)
   */
  children: ReactNode;
  /**
   * Click handler
   */
  onClick: () => void;
  /**
   * Tooltip text to display on hover
   */
  tooltip?: string;
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Tooltip delay in milliseconds
   * @default 600
   */
  tooltipDelay?: number;
}

/**
 * Toolbar button component with integrated tooltip support.
 * Built on Base UI Toolbar.Button for accessibility.
 *
 * @example
 * ```tsx
 * <ToolbarButton
 *   onClick={handleSave}
 *   tooltip="Save file"
 * >
 *   <SaveIcon size={15} />
 * </ToolbarButton>
 * ```
 */
export const ToolbarButton = ({
  children,
  onClick,
  tooltip,
  className = 'btn',
  disabled = false,
  tooltipDelay = 600
}: ToolbarButtonProps) => {
  // If no tooltip, return button directly
  if (!tooltip) {
    return (
      <BaseToolbar.Button className={className} onClick={onClick} disabled={disabled}>
        {children}
      </BaseToolbar.Button>
    );
  }

  // With tooltip
  return (
    <BaseTooltip.Provider delay={tooltipDelay}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger
          render={props => (
            <BaseToolbar.Button
              {...props}
              className={className}
              onClick={onClick}
              disabled={disabled}
            >
              {children}
            </BaseToolbar.Button>
          )}
        />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner sideOffset={8}>
            <BaseTooltip.Popup className="tooltip">{tooltip}</BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
};
