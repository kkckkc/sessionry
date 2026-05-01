import { Select } from '../Select'
import type { SelectOption } from '../Select'
import './SettingSelect.css'

export interface SettingSelectProps {
  label: string
  description?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export const SettingSelect = ({
  label,
  description,
  options,
  value,
  onChange,
  disabled = false
}: SettingSelectProps) => {
  return (
    <div className="sr-setting-select">
      <div className="sr-setting-select-row">
        <span className="sr-setting-select-label">{label}</span>
        <Select options={options} value={value} onChange={onChange} disabled={disabled} />
      </div>
      {description && <p className="sr-setting-select-description">{description}</p>}
    </div>
  )
}

SettingSelect.displayName = 'SettingSelect'
