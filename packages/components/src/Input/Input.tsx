import { Input as BaseInput } from '@base-ui/react/input';
import { Field } from '@base-ui/react/field';
import type { CSSProperties } from 'react';
import './Input.css';

export interface InputProps {
  /**
   * Label text for the input
   */
  label?: string;

  /**
   * Description text shown below the input
   */
  description?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Input type
   * @default 'text'
   */
  type?: 'text' | 'number' | 'email' | 'password' | 'url' | 'tel';

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Current value (controlled)
   */
  value?: string | number;

  /**
   * Default value (uncontrolled)
   */
  defaultValue?: string | number;

  /**
   * Change handler
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;

  /**
   * Value change handler (Base UI style)
   */
  // biome-ignore lint/suspicious/noExplicitAny: Base UI callback signature uses any for details
  onValueChange?: (value: string | number, details: any) => void;

  /**
   * Whether the input is disabled
   */
  disabled?: boolean;

  /**
   * Whether the input is required
   */
  required?: boolean;

  /**
   * Name attribute for form submission
   */
  name?: string;
  id?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  style?: CSSProperties;
  autoFocus?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Input component built on Base UI Input with Field integration.
 * Provides automatic validation states and accessibility features.
 *
 * @example
 *
 * ```tsx
 * <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
 * ```
 */
export const Input = ({
  label,
  description,
  error,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  onKeyPress,
  onValueChange,
  disabled = false,
  required = false,
  name,
  ...props
}: InputProps) => {
  const invalid = !!error;

  return (
    <Field.Root className="input-field" invalid={invalid} disabled={disabled}>
      {label && (
        <Field.Label className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </Field.Label>
      )}

      <BaseInput
        className="input"
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyPress={onKeyPress}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
        name={name}
        {...props}
      />

      {description && !error && (
        <Field.Description className="input-description">{description}</Field.Description>
      )}

      {error && <Field.Error className="input-error">{error}</Field.Error>}
    </Field.Root>
  );
};

Input.displayName = 'Input';
