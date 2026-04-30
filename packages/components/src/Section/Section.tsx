import { type ReactNode } from 'react'
import './Section.css'

export interface SectionProps {
  /**
   * Section title (displayed as uppercase label)
   */
  title: string
  
  /**
   * Optional description text
   */
  description?: string
  
  /**
   * Section content (typically form controls)
   */
  children: ReactNode
}

/**
 * Section component for grouping related settings or form controls.
 * 
 * @example
 *
 * ```tsx
 * <Section title="Appearance" description="Customize the look and feel">
 *   <Toggle label="Dark mode" checked={darkMode} onChange={setDarkMode} />
 * </Section>
 * ```
 */
export const Section = ({ title, description, children }: SectionProps) => {
  return (
    <section className="section-container">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      <div className="section-content">{children}</div>
    </section>
  )
}

Section.displayName = 'Section'