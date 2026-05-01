import { Select as BaseSelect } from '@base-ui/react/select'
import { Field } from '@base-ui/react/field'
import './Select.css'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  /**
   * Label text for the select
   */
  label?: string
  
  /**
   * Description text shown below the select
   */
  description?: string
  
  /**
   * Error message to display
   */
  error?: string
  
  /**
   * Array of options to display
   */
  options: SelectOption[]
  
  /**
   * Currently selected value (controlled)
   */
  value?: string
  
  /**
   * Default value (uncontrolled)
   */
  defaultValue?: string
  
  /**
   * Callback when selection changes
   */
  onChange?: (value: string) => void
  
  /**
   * Placeholder text when no value selected
   */
  placeholder?: string
  
  /**
   * Whether the select is disabled
   */
  disabled?: boolean
  
  /**
   * Whether the select is required
   */
  required?: boolean
  
  /**
   * Name attribute for form submission
   */
  name?: string
}

/**
 * Select component built on Base UI Select with enhanced accessibility.
 * Provides keyboard navigation, ARIA support, and automatic validation states.
 * 
 * @example
 *
 * ```tsx
 * const options = [
 *   { value: 'light', label: 'Light Theme' },
 *   { value: 'dark', label: 'Dark Theme' }
 * ]
 * 
 * <Select
 *   label="Theme"
 *   options={options}
 *   value={theme}
 *   onChange={setTheme}
 * />
 * ```
 */
export const Select = ({ 
  label,
  description,
  error,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  name
}: SelectProps) => {
  const hasError = Boolean(error)
  
  return (
    <Field.Root 
      className={hasError ? 'select-container has-error' : 'select-container'}
      disabled={disabled}
      invalid={hasError}
      name={name}
    >
      {label && (
        <Field.Label className="select-label">
          {label}
          {required && <span className="select-required"> *</span>}
        </Field.Label>
      )}
      
      <BaseSelect.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={(newValue) => onChange?.(newValue as string)}
        disabled={disabled}
        required={required}
        name={name}
      >
        <BaseSelect.Trigger className="select-trigger">
          <BaseSelect.Value placeholder={placeholder} />
          <BaseSelect.Icon className="select-icon">▼</BaseSelect.Icon>
        </BaseSelect.Trigger>
        
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="select-positioner">
            <BaseSelect.Popup className="select-popup">
              <BaseSelect.List>
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="select-item"
                  >
                    <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                    <BaseSelect.ItemIndicator className="select-item-indicator">
                      ✓
                    </BaseSelect.ItemIndicator>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
      
      {error && (
        <Field.Error className="select-error">
          {error}
        </Field.Error>
      )}
      
      {!error && description && (
        <Field.Description className="select-description">
          {description}
        </Field.Description>
      )}
    </Field.Root>
  )
}

Select.displayName = 'Select'
