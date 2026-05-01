import { type ReactNode } from 'react'
import './SettingsSection.css'

export interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export const SettingsSection = ({ title, description, children }: SettingsSectionProps) => {
  return (
    <section className="sr-settings-section">
      <div className="sr-settings-section-header">
        <h2>{title}</h2>
        {description && <p className="sr-settings-section-description">{description}</p>}
      </div>
      <div className="sr-settings-section-content">{children}</div>
    </section>
  )
}

SettingsSection.displayName = 'SettingsSection'
