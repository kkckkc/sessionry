import { Toggle } from '../Toggle';
import './SettingToggle.css';

export interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const SettingToggle = ({
  label,
  description,
  checked,
  onChange,
  disabled = false
}: SettingToggleProps) => {
  return (
    <div className="sr-setting-toggle">
      <div className="sr-setting-toggle-header">
        <Toggle
          label={label}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-setting-toggle-control"
        />
      </div>
      {description && <p className="sr-setting-toggle-description">{description}</p>}
    </div>
  );
};

SettingToggle.displayName = 'SettingToggle';
