import { useState, useRef, type KeyboardEvent } from 'react';
import { Button } from '@sessionry/components';

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '1rem',
        borderTop: '1px solid var(--color-border, #333)',
        backgroundColor: 'var(--color-surface-1, #1a1a1a)'
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
          padding: '0.75rem',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          backgroundColor: 'var(--color-surface-2, #2a2a2a)',
          color: 'inherit',
          border: '1px solid var(--color-border, #333)',
          borderRadius: '0.375rem',
          resize: 'none',
          maxHeight: '150px',
          overflowY: 'auto',
          outline: 'none'
        }}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        style={{
          alignSelf: 'flex-end',
          minWidth: '80px'
        }}
      >
        Send
      </Button>
    </div>
  );
};
