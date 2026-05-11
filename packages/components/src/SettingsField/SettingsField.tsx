import { type ReactNode } from 'react';
import './SettingsField.css';

export type SettingsFieldLayout = 'horizontal' | 'vertical';

export interface SettingsFieldProps {
  label?: ReactNode;
  description?: ReactNode;
  helpText?: ReactNode;
  layout?: SettingsFieldLayout;
  children: ReactNode;
  className?: string;
  controlClassName?: string;
  disabled?: boolean;
  htmlFor?: string;
}

export const SettingsField = ({
  label,
  description,
  helpText,
  layout = 'vertical',
  children,
  className,
  controlClassName,
  disabled = false,
  htmlFor
}: SettingsFieldProps) => {
  const helper = description ?? helpText;
  const classes = [
    'sr-settings-field',
    `sr-settings-field--${layout}`,
    disabled && 'sr-settings-field--disabled',
    className
  ]
    .filter(Boolean)
    .join(' ');
  const controlClasses = ['sr-settings-field-control', controlClassName].filter(Boolean).join(' ');

  const labelContent =
    label && htmlFor ? (
      <label className="sr-settings-field-label" htmlFor={htmlFor}>
        {label}
      </label>
    ) : label ? (
      <div className="sr-settings-field-label">{label}</div>
    ) : null;

  return (
    <div className={classes}>
      {(labelContent || helper) && (
        <div className="sr-settings-field-meta">
          {labelContent}
          {helper && <p className="sr-settings-field-description">{helper}</p>}
        </div>
      )}
      <div className={controlClasses}>{children}</div>
    </div>
  );
};

SettingsField.displayName = 'SettingsField';
