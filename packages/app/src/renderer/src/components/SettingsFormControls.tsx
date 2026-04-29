import type { ReactNode } from 'react'

interface SettingSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export const SettingsSection = ({ title, description, children }: SettingSectionProps) => {
  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="settings-section-content">{children}</div>
    </section>
  )
}

interface SettingToggleProps {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export const SettingToggle = ({ label, description, value, onChange, disabled }: SettingToggleProps) => {
  return (
    <div className="setting-control setting-toggle">
      <div className="setting-control-header">
        <label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="toggle-input"
          />
          <span className="toggle-switch" />
          <span className="setting-label">{label}</span>
        </label>
      </div>
      {description && <p className="setting-description">{description}</p>}
    </div>
  )
}

interface SettingInputProps {
  label: string
  description?: string
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number'
  placeholder?: string
  disabled?: boolean
}

export const SettingInput = ({
  label,
  description,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled
}: SettingInputProps) => {
  return (
    <div className="setting-control setting-input">
      <div className="setting-control-header">
        <label className="setting-label">{label}</label>
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="setting-input-field"
      />
      {description && <p className="setting-description">{description}</p>}
    </div>
  )
}

interface SettingSelectProps {
  label: string
  description?: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled?: boolean
}

export const SettingSelect = ({ label, description, value, options, onChange, disabled }: SettingSelectProps) => {
  return (
    <div className="setting-control setting-select">
      <div className="setting-control-header">
        <label className="setting-label">{label}</label>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="setting-select-field">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && <p className="setting-description">{description}</p>}
    </div>
  )
}
