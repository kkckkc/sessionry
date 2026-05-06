import { type ReactNode } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import './Dialog.css';

export interface DialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Dialog content (typically DialogHeader, DialogContent, DialogFooter)
   */
  children: ReactNode;
  /**
   * Additional CSS class name for the dialog popup
   */
  className?: string;
}

/**
 * Dialog component for modal interactions.
 * Built on Base UI Dialog for accessibility (focus trap, ESC to close, ARIA).
 *
 * @example
 *
 * ```tsx
 * <Dialog open={isOpen} onOpenChange={setIsOpen}>
 *   <DialogHeader title="Confirm Action" description="Are you sure?" />
 *   <DialogContent>
 *     <p>This action cannot be undone.</p>
 *   </DialogContent>
 *   <DialogFooter>
 *     <Button onClick={handleConfirm}>Confirm</Button>
 *     <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
 *   </DialogFooter>
 * </Dialog>
 * ```
 */
export const Dialog = ({ open, onOpenChange, children, className = 'dialog' }: DialogProps) => {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="dialog-backdrop" />
        <BaseDialog.Popup className={className}>{children}</BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
};

export interface DialogHeaderProps {
  /**
   * Dialog title
   */
  title: ReactNode;
  /**
   * Whether to show the close button
   */
  showClose?: boolean;
  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Dialog header with title and optional close button.
 */
export const DialogHeader = ({
  title,
  showClose = false,
  onClose,
  className = 'header'
}: DialogHeaderProps) => {
  return (
    <header className={className}>
      <BaseDialog.Title>{title}</BaseDialog.Title>
      {showClose && onClose && (
        // biome-ignore lint/a11y/useButtonType: Close button doesn't need explicit type
        <button className="dialog-close" aria-label="Close" onClick={onClose}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </header>
  );
};

export interface DialogContentProps {
  /**
   * Content to display in the dialog body
   */
  children: ReactNode;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Dialog content area for main body content.
 */
export const DialogContent = ({ children, className = 'content' }: DialogContentProps) => {
  return <div className={className}>{children}</div>;
};

export interface DialogFooterProps {
  /**
   * Footer content (typically action buttons)
   */
  children: ReactNode;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Dialog footer for action buttons.
 */
export const DialogFooter = ({ children, className = 'actions' }: DialogFooterProps) => {
  return <div className={className}>{children}</div>;
};

// Re-export Base UI components for advanced use cases
export const DialogRoot = BaseDialog.Root;
export const DialogPortal = BaseDialog.Portal;
export const DialogBackdrop = BaseDialog.Backdrop;
export const DialogPopup = BaseDialog.Popup;
export const DialogTitle = BaseDialog.Title;
export const DialogDescription = BaseDialog.Description;
// DialogClose is not exported to avoid nested button issues when used with Button component
// Use onClick handlers on buttons instead to close dialogs
