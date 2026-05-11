import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import * as TbIcons from 'react-icons/tb';
import type { ActionDescriptor } from '@sessionry/plugin-api';
import styles from './CommandPalette.module.css';

const resolveTablerIcon = (name?: string): IconType | null => {
  if (!name) return null;
  // biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic icon resolution by name is intentional
  const icon = TbIcons[name as keyof typeof TbIcons];
  return icon ? (icon as IconType) : null;
};

interface CommandPaletteProps {
  actions: ActionDescriptor[];
  onExecute: (actionId: string, args?: Record<string, unknown>) => void;
}

export const CommandPalette = ({ actions, onExecute }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);

  // Toggle with Cmd-K / Ctrl-K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Group actions by category
  const groupedActions = actions.reduce(
    (acc, action) => {
      const category = action.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(action);
      return acc;
    },
    {} as Record<string, ActionDescriptor[]>
  );

  const handleSelect = (actionId: string) => {
    setOpen(false);
    onExecute(actionId);
  };

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command Palette" aria-describedby={undefined}>
      <Command.Input placeholder="Search actions..." />
      <div style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        <h2>Command Palette</h2>
      </div>

      <Command.List>
        <Command.Empty>No actions found.</Command.Empty>

        {Object.entries(groupedActions)
          .sort(([a], [b]) => {
            if (a === 'General') return 1;
            if (b === 'General') return -1;
            return a.localeCompare(b);
          })
          .map(([category, categoryActions]) => (
            <Command.Group key={category} heading={category}>
              {categoryActions.map((action) => {
                const Icon = resolveTablerIcon(action.icon);

                return (
                  <Command.Item
                    key={action.id}
                    value={action.id}
                    keywords={[action.name, action.description || '']}
                    onSelect={() => handleSelect(action.id)}
                  >
                    <div className={styles.itemContent}>
                      <div className={styles.itemMain}>
                        {Icon && (
                          <span className={styles.icon} aria-hidden="true">
                            <Icon size={16} />
                          </span>
                        )}
                        <div className={styles.itemText}>
                          <div className={styles.itemName}>{action.name}</div>
                          {action.description && (
                            <div className={styles.itemDescription}>{action.description}</div>
                          )}
                        </div>
                      </div>
                      {action.defaultKeybinding && (
                        <kbd className={styles.keybinding}>{action.defaultKeybinding}</kbd>
                      )}
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
      </Command.List>
    </Command.Dialog>
  );
};
