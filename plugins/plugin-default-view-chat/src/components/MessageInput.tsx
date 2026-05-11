import { useState, useRef, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...'
}: MessageInputProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');
      requestAnimationFrame(() => resizeTextarea(textareaRef.current));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.altKey) {
        // Alt+Enter: insert newline manually
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = `${input.substring(0, start)}\n${input.substring(end)}`;
        setInput(newValue);
        // Set cursor position after the newline
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          resizeTextarea(textarea);
        });
      } else {
        // Enter without Alt: send message
        e.preventDefault();
        handleSend();
      }
    }
  };

  const hasContent = input.trim().length > 0;

  return (
    <div style={{ padding: '12px 24px 18px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'var(--input-bg)',
          border: '1px solid var(--border-input)',
          borderRadius: 8,
          padding: '8px 10px'
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            resizeTextarea(e.target);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.5,
            maxHeight: 160,
            letterSpacing: '-0.01em',
            padding: 0
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !hasContent}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 6,
            border: 'none',
            background: hasContent ? 'var(--accent)' : 'var(--badge-bg)',
            color: hasContent ? '#fff' : 'var(--text-dim)',
            fontSize: 12,
            fontWeight: 500,
            cursor: hasContent && !disabled ? 'pointer' : 'default',
            letterSpacing: '-0.01em',
            fontFamily: 'inherit',
            transition: 'background 0.12s',
            flexShrink: 0
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Send
        </button>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, letterSpacing: '0.02em' }}>
        Enter to send · Opt+Enter for newline
      </div>
    </div>
  );
};
