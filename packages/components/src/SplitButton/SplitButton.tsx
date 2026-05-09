import { type ReactNode, useState, useRef, useEffect } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import './SplitButton.css';

export interface SplitButtonOption {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface SplitButtonProps {
  /**
   * Button variant
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';

  /**
   * Main button content
   */
  children: ReactNode;

  /**
   * Main button click handler
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

  /**
   * Dropdown menu options
   */
  options: SplitButtonOption[];

  /**
   * Additional CSS class
   */
  className?: string;
}

/**
 * SplitButton component with a main action button and a dropdown menu.
 * The dropdown appears on the right side of the button.
 *
 * @example
 *
 * ```tsx
 * <SplitButton
 *   onClick={handleCommit}
 *   options={[
 *     { label: 'Commit', onClick: handleCommit },
 *     { label: 'Commit & Push', onClick: handleCommitAndPush },
 *     { label: 'Create PR', onClick: handleCreatePR }
 *   ]}
 * >
 *   Commit
 * </SplitButton>
 * ```
 */
export const SplitButton = ({
  variant = 'default',
  children,
  onClick,
  type = 'button',
  disabled = false,
  options,
  className: customClassName,
  ...props
}: SplitButtonProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const baseClassName = [
    'split-btn',
    variant === 'secondary' && 'is-secondary',
    variant === 'ghost' && 'is-ghost',
    variant === 'primary' && 'is-primary',
    variant === 'danger' && 'is-danger',
    customClassName
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="split-btn-container" ref={menuRef}>
      <div className={baseClassName}>
        <BaseButton
          className="split-btn__main"
          type={type}
          disabled={disabled}
          onClick={onClick}
          {...props}
        >
          {children}
        </BaseButton>
        <BaseButton
          className="split-btn__dropdown"
          type="button"
          disabled={disabled}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="More options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path d="M4 6l4 4 4-4z" />
          </svg>
        </BaseButton>
      </div>
      {menuOpen && (
        <div className="split-btn-menu" role="menu">
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              className="split-btn-menu-item"
              onClick={() => {
                setMenuOpen(false);
                option.onClick();
              }}
              disabled={option.disabled}
              role="menuitem"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

SplitButton.displayName = 'SplitButton';
