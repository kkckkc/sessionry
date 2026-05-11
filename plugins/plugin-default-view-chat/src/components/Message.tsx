import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
  showHeader?: boolean;
  timestamp?: string;
}

export const Message = ({ message, isStreaming, showHeader, timestamp }: MessageProps) => {
  const isUser = message.role === 'user';
  const label = isUser ? 'You' : 'AI';

  return (
    <div className="chat-message-group" style={{
      padding: '8px 24px',
      paddingLeft: isUser ? '6rem' : 24,
      display: 'flex',
      gap: 12
    }}>
<div style={{ flex: 1, minWidth: 0 }}>
        {showHeader && !isUser && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {label}
            </span>
          </div>
        )}
        <div
          style={{
            fontSize: 13,
            color: message.error ? 'var(--danger, #f87171)' : 'var(--text)',
            lineHeight: 1.55,
            letterSpacing: '-0.01em',
            wordWrap: 'break-word',
            ...(isUser ? { whiteSpace: 'pre-wrap' } : {}),
            ...(isUser ? {
              background: 'var(--canvas-bg, #141416)',
              borderRadius: 8,
              padding: '8px 12px'
            } : {})
          }}
        >
          {isUser ? message.content : <div className="chat-markdown"><Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown></div>}
          {isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 14,
                backgroundColor: 'var(--text-muted)',
                marginLeft: 3,
                verticalAlign: 'text-bottom',
                animation: 'blink 1s infinite'
              }}
            />
          )}
          {isUser && showHeader && timestamp && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", marginTop: 4, textAlign: 'right' }}>
              {timestamp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
