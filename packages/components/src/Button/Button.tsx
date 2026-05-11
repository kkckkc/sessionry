import { type CSSProperties, type ReactNode } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import './Button.css';

export interface ButtonProps {
  /**
   * Button variant
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';

  /**
   * Tooltip text to display on hover
   */
  tooltip?: string;

  /**
   * Button content
   */
  children: ReactNode;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Button type
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
  size?: 'small' | 'medium';

  /**
   * Whether the button should remain focusable when disabled
   * Useful for loading states to maintain focus
   * @default false
   */
  focusableWhenDisabled?: boolean;

  /**
   * Tooltip delay in milliseconds
   * @default 600
   */
  tooltipDelay?: number;
}

/**
 * Button component built on Base UI Button for enhanced accessibility.
 * Supports variants, tooltips, and maintains focus during loading states.
 *
 * @example
 *
 * ```tsx
 * <Button onClick={handleClick}>Click me</Button>
 * ```
 */
export const Button = ({
  variant = 'default',
  tooltip,
  children,
  onClick,
  type = 'button',
  disabled = false,
  title,
  className: customClassName,
  size,
  focusableWhenDisabled = false,
  tooltipDelay = 600,
  ...props
}: ButtonProps) => {
  const className = [
    'btn',
    size === 'small' && 'is-small',
    size === 'medium' && 'is-medium',
    variant === 'secondary' && 'is-secondary',
    variant === 'ghost' && 'is-ghost',
    variant === 'primary' && 'is-primary',
    variant === 'danger' && 'is-danger',
    customClassName
  ]
    .filter(Boolean)
    .join(' ');

  // If no tooltip, return button directly
  if (!tooltip) {
    return (
      <BaseButton
        className={className}
        type={type}
        disabled={disabled}
        title={title}
        focusableWhenDisabled={focusableWhenDisabled}
        onClick={onClick}
        {...props}
      >
        {children}
      </BaseButton>
    );
  }

  // With tooltip
  return (
    <BaseTooltip.Provider delay={tooltipDelay}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger
          render={triggerProps => (
            <BaseButton
              {...triggerProps}
              className={className}
              type={type}
              disabled={disabled}
              title={title}
              focusableWhenDisabled={focusableWhenDisabled}
              onClick={onClick}
              {...props}
            >
              {children}
            </BaseButton>
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

Button.displayName = 'Button';
