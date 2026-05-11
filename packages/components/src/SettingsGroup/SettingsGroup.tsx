import { type ReactNode } from 'react';
import './SettingsGroup.css';

export interface SettingsGroupProps {
  children: ReactNode;
  className?: string;
}

export const SettingsGroup = ({ children, className }: SettingsGroupProps) => {
  return (
    <div className={['sr-settings-group', className].filter(Boolean).join(' ')}>{children}</div>
  );
};

SettingsGroup.displayName = 'SettingsGroup';
