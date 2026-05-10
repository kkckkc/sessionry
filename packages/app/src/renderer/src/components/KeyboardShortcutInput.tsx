import { useState, useEffect } from 'react';
import { TbX, TbArrowBackUp } from 'react-icons/tb';
import { normalizeKeyboardEvent } from '../lib/keybindings';

interface KeyboardShortcutInputProps {
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  disabled?: boolean;
  hasCustomValue?: boolean;
}

const formatKeybindingForDisplay = (keybinding: string): string => {
  if (!keybinding) return '';
  
  const parts = keybinding.split('-');
  return parts
    .map((part, index) => {
      if (part === 'C') return navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl';
      if (part === 'M') return navigator.platform.includes('Mac') ? 'Option' : 'Alt';
      if (part === 'Shift') return 'Shift';
      // Treat 'S' as Shift only if it's not the last part
      if (part === 'S' && index < parts.length - 1) return 'Shift';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('+');
};

export const KeyboardShortcutInput = ({
  value,
  onChange,
  onReset,
  disabled,
  hasCustomValue
}: KeyboardShortcutInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    // Ignore modifier-only keys
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
      return;
    }

    const normalized = normalizeKeyboardEvent(event.nativeEvent);
    setDisplayValue(normalized);
    onChange(normalized);
    setIsRecording(false);
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsRecording(true);
    }
  };

  const handleBlur = () => {
    setIsRecording(false);
  };

  const handleClear = () => {
    setDisplayValue('');
    onChange('');
  };

  return (
    <div className="keyboard-shortcut-input">
      <input
        type="text"
        value={isRecording ? 'Press keys...' : formatKeybindingForDisplay(displayValue) || 'Not set'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        readOnly
        placeholder="Click to record"
        className={isRecording ? 'recording' : ''}
      />
      <button
        type="button"
        onClick={handleClear}
        className="keyboard-shortcut-clear"
        aria-label="Clear shortcut"
        title="Clear keybinding"
        disabled={!displayValue || disabled}
      >
        <TbX size={14} />
      </button>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="keyboard-shortcut-reset-icon"
          aria-label="Reset to default"
          title="Reset to default"
          disabled={!hasCustomValue || disabled}
        >
          <TbArrowBackUp size={14} />
        </button>
      )}
    </div>
  );
};
