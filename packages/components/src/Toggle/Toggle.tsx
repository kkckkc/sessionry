import { Switch } from '@base-ui/react/switch'
import './Toggle.css'

export interface ToggleProps {
  /**
   * Label text for the toggle
   */
  label?: string
  
  /**
   * Whether the toggle is checked
   */
  checked: boolean
  
  /**
   * Callback when toggle state changes
   */
  onChange: (checked: boolean) => void
  
  /**
   * Whether the toggle is disabled
   */
  disabled?: boolean
  
  /**
   * Additional props passed to the root element
   */
  [key: string]: any
}

/**
 * Toggle switch component for boolean settings.
 * Built with Base UI Switch primitive for enhanced accessibility.
 * 
 * Features:
 * - Full keyboard support (Space/Enter to toggle)
 * - ARIA attributes (role="switch", aria-checked)
 * - Focus management
 * - Screen reader support
 * 
 * @example
 *
 * ```tsx
 * const [enabled, setEnabled] = useState(false)
 * 
 * <Toggle
 *   label="Enable feature"
 *   checked={enabled}
 *   onChange={setEnabled}
 * />
 * ```
 */
export const Toggle = ({ 
  label,
  checked,
  onChange,
  disabled,
  className = '',
  ...props 
}: ToggleProps) => {
  return (
    <label className={['toggle-container', className].filter(Boolean).join(' ')}>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="toggle-root"
        {...props}
      >
        <Switch.Thumb className="toggle-switch" />
      </Switch.Root>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  )
}

Toggle.displayName = 'Toggle'
