import { SettingsField } from '../SettingsField';
import './SettingColorInput.css';

export interface SettingColorInputProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const SettingColorInput = ({
  label,
  description,
  value,
  onChange,
  disabled = false
}: SettingColorInputProps) => {
  return (
    <div className="sr-setting-color-input">
      <SettingsField
        label={label}
        description={description}
        layout="horizontal"
        disabled={disabled}
      >
        <div className="sr-setting-color-input-control">
          <div className="sr-setting-color-swatch" style={{ background: value }} />
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className="sr-setting-color-native"
          />
        </div>
      </SettingsField>
    </div>
  );
};

SettingColorInput.displayName = 'SettingColorInput';
