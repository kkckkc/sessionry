import type { AppPlugin, MainPluginContext } from '@sessionry/plugin-api';
import { chatPluginDefinition } from './definition';
import type { ChatPluginSettings } from './settings';
import { DEFAULT_CHAT_SETTINGS, normalizeChatSettings } from './settings';
import { CHAT_IPC_CHANNELS } from './constants';
import type {
  SendMessagePayload,
  LoadHistoryPayload,
  ClearHistoryPayload,
  ListModelsPayload
} from './types';

const activateMain = async (context: MainPluginContext): Promise<void> => {
  // Dynamically import ChatService to avoid bundling node dependencies in renderer
  const { ChatService } = await import('./chatService');

  const pluginSettings = normalizeChatSettings(
    (context.settings.plugins['plugin-default-view-chat'] as ChatPluginSettings | undefined) ??
      DEFAULT_CHAT_SETTINGS
  );

  // Get workspace root for history storage
  const workspaceState = context.workspace.snapshot;
  const workspaceRoot = workspaceState.sessions[0]?.folder ?? process.cwd();

  const chatService = new ChatService(
    (channel, data) => context.ipc.emit(channel, data),
    pluginSettings,
    workspaceRoot,
    context.workspace
  );

  // Register IPC handlers
  context.ipc.on(CHAT_IPC_CHANNELS.sendMessage, async (payload: unknown) => {
    const { paneId, content } = payload as SendMessagePayload;
    await chatService.sendMessage(paneId, content);
  });

  context.ipc.handle(CHAT_IPC_CHANNELS.loadHistory, async (payload: unknown) => {
    const { paneId } = payload as LoadHistoryPayload;
    const messages = await chatService.loadHistory(paneId);
    return { messages };
  });

  context.ipc.on(CHAT_IPC_CHANNELS.clearHistory, async (payload: unknown) => {
    const { paneId } = payload as ClearHistoryPayload;
    await chatService.clearHistory(paneId);
  });

  context.ipc.handle(CHAT_IPC_CHANNELS.listModels, async (payload: unknown) => {
    try {
      const { provider } = (payload as ListModelsPayload | undefined) ?? {};
      const models = await chatService.listModels(provider);
      return { models };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { error: errorMessage };
    }
  });

  // Listen for settings changes
  let currentSettings = pluginSettings;
  context.workspace.subscribeAll(event => {
    if (event.type === 'settings.updated') {
      const afterSettings = event.after as unknown as { plugins?: Record<string, unknown> };
      const newPluginSettings = normalizeChatSettings(
        (afterSettings.plugins?.['plugin-default-view-chat'] as ChatPluginSettings | undefined) ??
          DEFAULT_CHAT_SETTINGS
      );

      if (JSON.stringify(newPluginSettings) !== JSON.stringify(currentSettings)) {
        chatService.updateSettings(newPluginSettings);
      }

      currentSettings = newPluginSettings;
    }
  });

  // Clean up sessions when panes are removed
  context.workspace.subscribeAll(event => {
    if (event.type === 'pane.removed' && event.before.type === 'chat') {
      chatService.removeSession(event.before.id);
    }
  });
};

export const chatPlugin: AppPlugin = {
  ...chatPluginDefinition,
  activateMain
};

export default chatPlugin;
