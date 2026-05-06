import type { IconType } from 'react-icons';
import * as TbIcons from 'react-icons/tb';

interface PluginWithSettings {
  id: string;
  name: string;
  settingsView: {
    id: string;
    title: string;
    description?: string;
    icon?: string;
  };
}

interface SettingsNavProps {
  plugins: PluginWithSettings[];
  selectedPluginId: string | null;
  onSelect: (pluginId: string) => void;
}

const resolveTablerIcon = (name: string): IconType | null => {
  // biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic icon resolution by name is intentional
  const icon = TbIcons[name as keyof typeof TbIcons];
  return icon ? (icon as IconType) : null;
};

export const SettingsNav = ({ plugins, selectedPluginId, onSelect }: SettingsNavProps) => {
  return (
    <nav className="settings-nav">
      <h2 className="settings-nav-title">Settings</h2>
      <ul className="settings-nav-list">
        {plugins.map(plugin => {
          const Icon = plugin.settingsView.icon
            ? resolveTablerIcon(plugin.settingsView.icon)
            : null;
          const isActive = selectedPluginId === plugin.id;

          return (
            <li key={plugin.id} className="settings-nav-item">
              {/* biome-ignore lint/a11y/useButtonType: Navigation button doesn't need explicit type */}
              <button
                className={`settings-nav-button ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelect(plugin.id)}
              >
                {Icon && <Icon size={16} className="settings-nav-icon" />}
                <span className="settings-nav-label">{plugin.settingsView.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
