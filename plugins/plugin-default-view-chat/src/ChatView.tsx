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

        setStreamingMessageId(data.messageId);
        setMessages(prev => {
          const updated = [...prev];
          const messageIndex = updated.findIndex(m => m.id === data.messageId);
          if (messageIndex !== -1) {
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: updated[messageIndex].content + data.chunk
            };
          } else {
            updated.push({
              id: data.messageId,
              role: 'assistant',
              content: data.chunk,
              timestamp: Date.now()
            });
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

      const userMessage: Message = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, userMessage]);

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

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: 'var(--term-bg)'
      }}
    >
      {error && (
        <div
          style={{
            padding: '8px 24px',
            fontSize: 12,
            color: 'var(--danger)',
            background: 'var(--danger-bg)',
            borderBottom: '1px solid var(--border-subtle)',
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
              color: 'var(--danger)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 4px',
              lineHeight: 1
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
    </div>
  );
};
