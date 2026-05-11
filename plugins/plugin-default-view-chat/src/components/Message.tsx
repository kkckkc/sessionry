import { useState } from 'react';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
}

export const Message = ({ message, isStreaming }: MessageProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '1rem',
        maxWidth: '85%',
        alignSelf: isUser ? 'flex-end' : 'flex-start'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.25rem',
          fontSize: '0.75rem',
          opacity: 0.7
        }}
      >
        <span style={{ fontWeight: 500 }}>
          {isUser ? 'You' : 'Assistant'}
        </span>
        <span>{timestamp}</span>
      </div>

      <div
        style={{
          position: 'relative',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          backgroundColor: isUser
            ? 'var(--color-primary-bg, #0066cc)'
            : message.error
              ? 'var(--color-error-bg, #ff4444)'
              : 'var(--color-surface-2, #2a2a2a)',
          color: isUser || message.error ? '#ffffff' : 'inherit',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          border: message.error ? '1px solid var(--color-error, #ff6666)' : 'none'
        }}
      >
        {message.content}
        {isStreaming && (
          <span
            style={{
              display: 'inline-block',
              width: '0.5rem',
              height: '1rem',
              backgroundColor: 'currentColor',
              marginLeft: '0.25rem',
              animation: 'blink 1s infinite'
            }}
          />
        )}

        {!isUser && !isStreaming && message.content && (
          <button
            type="button"
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
};
