import { SettingsField } from '../SettingsField';
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
      <SettingsField
        label={label}
        description={description}
        layout="horizontal"
        disabled={disabled}
      >
        <Toggle
          aria-label={label}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-setting-toggle-control"
        />
      </SettingsField>
    </div>
  );
};

SettingToggle.displayName = 'SettingToggle';
