import { useState, useEffect, useCallback } from 'react';
import type { PaneViewProps } from '@sessionry/plugin-api';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import type { Message, StreamChunkPayload, StreamCompletePayload, StreamErrorPayload, ChatHistoryResponse } from './types';
import { CHAT_IPC_CHANNELS } from './constants';

export const ChatView = ({ pane }: PaneViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await window.terminalApp.pluginIpc.invoke<ChatHistoryResponse>(
          CHAT_IPC_CHANNELS.loadHistory,
          { paneId: pane.id }
        );
        if (response?.messages) {
          setMessages(response.messages);
        }
      } catch (err) {
        console.error('[ChatView] Failed to load history:', err);
      }
    };

    void loadHistory();
  }, [pane.id]);

  // Listen for streaming chunks
  useEffect(() => {
    const unsubscribeChunk = window.terminalApp.pluginIpc.on(
      CHAT_IPC_CHANNELS.streamChunk,
      (payload) => {
        const data = payload as StreamChunkPayload;
        if (data.paneId !== pane.id) return;

        setMessages(prev => {
          const updated = [...prev];
          const messageIndex = updated.findIndex(m => m.id === data.messageId);
          if (messageIndex !== -1) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: updated[messageIndex].content + data.chunk
            };
          }
          return updated;
        });
      }
    );

    const unsubscribeComplete = window.terminalApp.pluginIpc.on(
      CHAT_IPC_CHANNELS.streamComplete,
      (payload) => {
        const data = payload as StreamCompletePayload;
        if (data.paneId !== pane.id) return;
        setIsStreaming(false);
        setStreamingMessageId(undefined);
        setError(null);
      }
    );

    const unsubscribeError = window.terminalApp.pluginIpc.on(
      CHAT_IPC_CHANNELS.streamError,
      (payload) => {
        const data = payload as StreamErrorPayload;
        if (data.paneId !== pane.id) return;
        setIsStreaming(false);
        setStreamingMessageId(undefined);
        setError(data.error);

        // Mark the message as error
        setMessages(prev => {
          const updated = [...prev];
          const messageIndex = updated.findIndex(m => m.id === data.messageId);
          if (messageIndex !== -1) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              error: true
            };
          }
          return updated;
        });
      }
    );

    return () => {
      unsubscribeChunk();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [pane.id]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      setError(null);
      setIsStreaming(true);

      // Add user message immediately
      const userMessage: Message = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content,
        timestamp: Date.now()
      };

      // Add placeholder for assistant message
      const assistantMessageId = `msg_${Date.now()}_assistant`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setStreamingMessageId(assistantMessageId);

      // Send to main process
      try {
        window.terminalApp.pluginIpc.send(CHAT_IPC_CHANNELS.sendMessage, {
          paneId: pane.id,
          content
        });
      } catch (err) {
        console.error('[ChatView] Failed to send message:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
        setIsStreaming(false);
        setStreamingMessageId(undefined);
      }
    },
    [pane.id, isStreaming]
  );

  const handleClearHistory = useCallback(async () => {
    if (isStreaming) return;

    try {
      window.terminalApp.pluginIpc.send(CHAT_IPC_CHANNELS.clearHistory, {
        paneId: pane.id
      });
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('[ChatView] Failed to clear history:', err);
      setError('Failed to clear history');
    }
  }, [pane.id, isStreaming]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-surface-0, #0a0a0a)'
      }}
    >
      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-error-bg, #ff4444)',
            color: '#ffffff',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0 0.5rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      <MessageList messages={messages} streamingMessageId={streamingMessageId} />

      <MessageInput
        onSend={handleSendMessage}
        disabled={isStreaming}
        placeholder={isStreaming ? 'Waiting for response...' : 'Type a message...'}
      />

      {messages.length > 0 && (
        <div
          style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid var(--color-border, #333)',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <button
            type="button"
            onClick={handleClearHistory}
            disabled={isStreaming}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary, #888)',
              border: '1px solid var(--color-border, #333)',
              borderRadius: '0.25rem',
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              opacity: isStreaming ? 0.5 : 1
            }}
          >
            Clear History
          </button>
        </div>
      )}
    </div>
  );
};
