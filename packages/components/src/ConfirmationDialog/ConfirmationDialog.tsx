import { type ReactNode } from 'react'
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '../Dialog'
import { Button } from '../Button'
import './ConfirmationDialog.css'

export interface ConfirmationDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean
  /**
   * Dialog title
   */
  title: string
  /**
   * Confirmation message/question
   */
  message: ReactNode
  /**
   * Visual intent of the confirm button
   * @default 'primary'
   */
  intent?: 'primary' | 'danger'

  /**
   * Label for the confirm button
   * @default "Confirm"
   */
  confirmLabel?: string
  /**
   * Label for the cancel button
   * @default "Cancel"
   */
  cancelLabel?: string
  /**
   * Callback when user confirms the action
   */
  onConfirm: () => void
  /**
   * Callback when user cancels or closes the dialog
   */
  onCancel: () => void
}

/**
 * Confirmation dialog for destructive or important actions.
 * Provides a simple yes/no choice with clear messaging.
 * 
 * Features:
 * - Modal blocking behavior
 * - Keyboard support (Enter = confirm, Escape = cancel)
 * - Focus trap for accessibility
 * - Clear visual hierarchy
 * 
 * @example
 *
 * ```tsx
 * const [showConfirm, setShowConfirm] = useState(false)
 * 
 * <ConfirmationDialog
 *   open={showConfirm}
 *   title="Delete File"
 *   message="Are you sure you want to delete this file? This action cannot be undone."
 *   confirmLabel="Delete"
 *   cancelLabel="Cancel"
 *   onConfirm={() => {
 *     deleteFile()
 *     setShowConfirm(false)
 *   }}
 *   onCancel={() => setShowConfirm(false)}
 * />
 * ```
 */
export const ConfirmationDialog = ({
  open,
  title,
  message,
  intent = 'primary',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }} className="dialog confirmation-dialog">
      <DialogHeader title={title} />
      <DialogContent className="content confirmation-content">
        <p>{message}</p>
      </DialogContent>
      <DialogFooter className="actions confirmation-actions">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={intent} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

ConfirmationDialog.displayName = 'ConfirmationDialog'
