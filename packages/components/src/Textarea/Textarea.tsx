import { Field } from '@base-ui/react/field';
import type { CSSProperties, TextareaHTMLAttributes } from 'react';
import './Textarea.css';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  /**
   * Label text for the textarea
   */
  label?: string;

  /**
   * Description text shown below the textarea
   */
  description?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Current value (controlled)
   */
  value?: string;

  /**
   * Default value (uncontrolled)
   */
  defaultValue?: string;

  /**
   * Change handler
   */
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;

  /**
   * Whether the textarea is disabled
   */
  disabled?: boolean;

  /**
   * Whether the textarea is required
   */
  required?: boolean;

  /**
   * Name attribute for form submission
   */
  name?: string;
  id?: string;
  rows?: number;
  style?: CSSProperties;
  autoFocus?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Textarea component with Field integration matching Input component styling.
 * Provides automatic validation states and accessibility features.
 *
 * @example
 *
 * ```tsx
 * <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
 * ```
 */
export const Textarea = ({
  label,
  description,
  error,
  placeholder,
  value,
  defaultValue,
  onChange,
  disabled = false,
  required = false,
  name,
  rows = 3,
  className: customClassName,
  ...props
}: TextareaProps) => {
  const invalid = !!error;

  return (
    <Field.Root className="textarea-field" invalid={invalid} disabled={disabled}>
      {label && (
        <Field.Label className="textarea-label">
          {label}
          {required && <span className="required">*</span>}
        </Field.Label>
      )}

      <textarea
        className={['textarea', customClassName].filter(Boolean).join(' ')}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        required={required}
        name={name}
        rows={rows}
        {...props}
      />

      {description && !error && (
        <Field.Description className="textarea-description">{description}</Field.Description>
      )}

      {error && <Field.Error className="textarea-error">{error}</Field.Error>}
    </Field.Root>
  );
};

Textarea.displayName = 'Textarea';
