import { useEffect, useRef } from 'react';
import type { Message as MessageType } from '../types';
import { Message } from './Message';

interface MessageListProps {
  messages: MessageType[];
  streamingMessageId?: string;
}

export const MessageList = ({ messages, streamingMessageId }: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  });

  // Track if user has scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    shouldAutoScrollRef.current = isAtBottom;
  };

  if (messages.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-secondary, #888)',
          fontSize: '0.875rem'
        }}
      >
        Start a conversation by typing a message below
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {messages.map(message => (
        <Message
          key={message.id}
          message={message}
          isStreaming={message.id === streamingMessageId}
        />
      ))}
    </div>
  );
};
