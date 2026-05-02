import './SettingColorInput.css'

export interface SettingColorInputProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
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
      <div className="sr-setting-color-input-row">
        <span className="sr-setting-color-input-label">{label}</span>
        <div className="sr-setting-color-input-control">
          <div className="sr-setting-color-swatch" style={{ background: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="sr-setting-color-native"
          />
        </div>
      </div>
      {description && <p className="sr-setting-color-input-description">{description}</p>}
    </div>
  )
}

SettingColorInput.displayName = 'SettingColorInput'
