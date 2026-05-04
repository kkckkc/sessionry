import { type ReactNode } from 'react'
import './Badge.css'

export interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
  className?: string
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const classes = ['badge', `badge--${variant}`, className].filter(Boolean).join(' ')
  return <span className={classes}>{children}</span>
}

Badge.displayName = 'Badge'
