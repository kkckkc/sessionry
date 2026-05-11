import { SettingsField, type SettingsFieldLayout } from '../SettingsField';
import { Select } from '../Select';
import type { SelectOption } from '../Select';
import './SettingSelect.css';

export interface SettingSelectProps {
  label: string;
  description?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  layout?: SettingsFieldLayout;
}

export const SettingSelect = ({
  label,
  description,
  options,
  value,
  onChange,
  disabled = false,
  layout = 'vertical'
}: SettingSelectProps) => {
  return (
    <div className="sr-setting-select">
      <SettingsField label={label} description={description} layout={layout} disabled={disabled}>
        <Select options={options} value={value} onChange={onChange} disabled={disabled} />
      </SettingsField>
    </div>
  );
};

SettingSelect.displayName = 'SettingSelect';
