import { useEffect, useRef } from 'react';
import type { Message as MessageType } from '../types';
import { Message } from './Message';

interface MessageListProps {
  messages: MessageType[];
  streamingMessageId?: string;
}

interface MessageGroup {
  role: MessageType['role'];
  messages: MessageType[];
}

function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

function groupMessages(messages: MessageType[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last.role === m.role && m.timestamp - last.messages[last.messages.length - 1].timestamp < 5 * 60 * 1000) {
      last.messages.push(m);
    } else {
      groups.push({ role: m.role, messages: [m] });
    }
  }
  return groups;
}

export const MessageList = ({ messages, streamingMessageId }: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (shouldAutoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  });

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: 13
        }}
      >
        Start a conversation by typing a message below.
      </div>
    );
  }

  const groups = groupMessages(messages);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ flex: 1, overflow: 'auto', padding: '16px 0' }}
    >
      {groups.map((group) => (
        <div key={group.messages[0].id}>
          {group.messages.map((m, i) => (
            <Message
              key={m.id}
              message={m}
              isStreaming={m.id === streamingMessageId}
              showHeader={i === 0}
              timestamp={i === 0 ? formatChatTime(m.timestamp) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
