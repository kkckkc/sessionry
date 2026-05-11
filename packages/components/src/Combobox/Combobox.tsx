import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Field } from '@base-ui/react/field';
import { useRef, type ComponentType, type CSSProperties, type SVGProps } from 'react';
import { TbChevronsDown } from 'react-icons/tb';
import './Combobox.css';

const ComboboxChevronIcon = TbChevronsDown as ComponentType<SVGProps<SVGSVGElement>>;

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  /**
   * Label text for the combobox
   */
  label?: string;

  /**
   * Description text shown below the combobox
   */
  description?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Array of options to display
   */
  options: ComboboxOption[];

  /**
   * Currently selected value (controlled)
   */
  value?: string;

  /**
   * Default value (uncontrolled)
   */
  defaultValue?: string;

  /**
   * Callback when value changes
   */
  onChange?: (value: string) => void;

  /**
   * Callback when dropdown opens/closes
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Whether options are currently loading
   */
  loading?: boolean;

  /**
   * Message to show when loading
   */
  loadingMessage?: string;

  /**
   * Message to show when there's an error
   */
  errorMessage?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether the combobox is disabled
   */
  disabled?: boolean;

  /**
   * Whether the combobox is required
   */
  required?: boolean;

  /**
   * Name attribute for form submission
   */
  name?: string;

  /**
   * ID attribute
   */
  id?: string;

  /**
   * Custom styles
   */
  style?: CSSProperties;
}

/**
 * Combobox component built on Base UI Combobox with Field integration.
 * Allows both selecting from a dropdown and entering text manually.
 *
 * @example
 *
 * ```tsx
 * const options = [
 *   { value: 'gpt-4', label: 'GPT-4' },
 *   { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
 * ]
 *
 * <Combobox
 *   label="Model"
 *   options={options}
 *   value={model}
 *   onChange={setModel}
 * />
 * ```
 */
export const Combobox = ({
  label,
  description,
  error,
  options,
  value,
  defaultValue,
  onChange,
  onOpenChange,
  loading = false,
  loadingMessage = 'Loading...',
  errorMessage,
  placeholder,
  disabled = false,
  required = false,
  name,
  id,
  style
}: ComboboxProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const invalid = !!error;
  const hasOptions = options.length > 0;
  const showError = !!errorMessage;
  const showLoading = loading && !hasOptions;

  return (
    <Field.Root
      className="combobox-field"
      invalid={invalid}
      disabled={disabled}
      name={name}
      style={style}
    >
      {label && (
        <Field.Label className="combobox-label">
          {label}
          {required && <span className="required">*</span>}
        </Field.Label>
      )}

      <BaseCombobox.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={newValue => onChange?.(newValue as string)}
        onInputValueChange={newValue => onChange?.(newValue)}
        onOpenChange={onOpenChange}
        itemToStringLabel={itemValue => {
          const option = options.find(({ value: optionValue }) => optionValue === itemValue);
          return option?.label ?? String(itemValue ?? '');
        }}
        itemToStringValue={itemValue => String(itemValue ?? '')}
        disabled={disabled}
        name={name}
      >
        <div className="combobox-input-wrapper" ref={anchorRef}>
          <BaseCombobox.Input
            id={id}
            className="combobox-input"
            placeholder={placeholder}
            required={required}
          />
          <BaseCombobox.Trigger
            type="button"
            className="combobox-trigger"
            disabled={disabled}
            aria-label="Open options"
          >
            <BaseCombobox.Icon className="combobox-icon">
              <ComboboxChevronIcon aria-hidden="true" focusable="false" />
            </BaseCombobox.Icon>
          </BaseCombobox.Trigger>
        </div>

        <BaseCombobox.Portal>
          <BaseCombobox.Positioner
            align="start"
            anchor={anchorRef}
            className="combobox-positioner"
            sideOffset={4}
          >
            <BaseCombobox.Popup className="combobox-popup">
              <BaseCombobox.List>
                {showLoading && (
                  <div className="combobox-message">{loadingMessage}</div>
                )}
                {showError && !showLoading && (
                  <div className="combobox-message combobox-error-message">{errorMessage}</div>
                )}
                {!showLoading && !showError && hasOptions && options.map(option => (
                  <BaseCombobox.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="combobox-item"
                  >
                    <span className="combobox-item-label">{option.label}</span>
                    <BaseCombobox.ItemIndicator className="combobox-item-indicator">
                      ✓
                    </BaseCombobox.ItemIndicator>
                  </BaseCombobox.Item>
                ))}
              </BaseCombobox.List>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>

      {description && !error && (
        <Field.Description className="combobox-description">{description}</Field.Description>
      )}

      {error && <Field.Error className="combobox-error">{error}</Field.Error>}
    </Field.Root>
  );
};

Combobox.displayName = 'Combobox';
