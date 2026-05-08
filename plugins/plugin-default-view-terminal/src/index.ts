import type { AppPlugin, MainPluginContext } from '@sessionry/plugin-api';
import { TERMINAL_IPC_CHANNELS } from '@sessionry/plugin-api';
import { terminalPanePluginDefinition } from './definition';
import type { TerminalPluginSettings } from './settings';

const activateMain = async (context: MainPluginContext): Promise<void> => {
  // Keep node-pty evaluation inside main-process activation.
  const { TerminalService } = await import('./terminalService');

  const pluginSettings = context.settings.plugins['plugin-default-view-terminal'] as
    | TerminalPluginSettings
    | undefined;
  const tmuxSettings = pluginSettings?.tmux ?? {
    enabled: false,
    dedicatedSocket: true,
    disableStatusBar: false,
    inheritConfig: true,
    killOnExit: true
  };

  const terminalService = new TerminalService(
    event => context.ipc.emit(TERMINAL_IPC_CHANNELS.data, event),
    event => context.ipc.emit(TERMINAL_IPC_CHANNELS.state, event),
    event => context.ipc.emit(TERMINAL_IPC_CHANNELS.exit, event),
    tmuxSettings
  );

  context.ipc.handle(TERMINAL_IPC_CHANNELS.create, input =>
    terminalService.createSession(input as Parameters<typeof terminalService.createSession>[0])
  );
  context.ipc.on(TERMINAL_IPC_CHANNELS.input, payload =>
    terminalService.handleInput(payload as Parameters<typeof terminalService.handleInput>[0])
  );
  context.ipc.on(TERMINAL_IPC_CHANNELS.resize, payload =>
    terminalService.handleResize(payload as Parameters<typeof terminalService.handleResize>[0])
  );

  context.workspace.subscribeAll(event => {
    if (event.type === 'pane.removed' && event.before.type === 'terminal') {
      terminalService.killSession(event.before.id);
    }
  });

  context.onBeforeQuit(() => terminalService.dispose());
};

export const terminalPanePlugin: AppPlugin = {
  ...terminalPanePluginDefinition,
  activateMain
};

export default terminalPanePlugin;
