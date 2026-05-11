export interface TerminalPreset {
  id: string;
  name: string;
  command: string;
  icon?: string;
}

export interface TerminalPresetsPluginSettings {
  presets: TerminalPreset[];
}

const DEFAULT_ICON = 'TbTerminal';
const DEFAULT_SETTINGS: TerminalPresetsPluginSettings = { presets: [] };

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `terminal-preset-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizePreset = (preset: unknown): TerminalPreset | null => {
  if (!preset || typeof preset !== 'object') return null;

  const candidate = preset as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const command = typeof candidate.command === 'string' ? candidate.command.trim() : '';

  if (!name || !command) return null;

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : createId(),
    name,
    command,
    icon: typeof candidate.icon === 'string' && candidate.icon.trim() ? candidate.icon : DEFAULT_ICON
  };
};

export const getTerminalPresetsSettings = (settings: unknown): TerminalPresetsPluginSettings => {
  if (!settings || typeof settings !== 'object') return DEFAULT_SETTINGS;

  const candidate = settings as Record<string, unknown>;
  const presets = Array.isArray(candidate.presets)
    ? candidate.presets.map(normalizePreset).filter((preset): preset is TerminalPreset => preset !== null)
    : [];

  return { presets };
};

export const createEmptyPreset = (): TerminalPreset => ({
  id: createId(),
  name: '',
  command: '',
  icon: DEFAULT_ICON
});
