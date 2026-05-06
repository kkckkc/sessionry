import './SegmentedControl.css';

export interface SegmentedControlItem {
  label: string;
  value: string;
}

export interface SegmentedControlProps {
  /**
   * The list of tab items to display.
   */
  items: SegmentedControlItem[];

  /**
   * The currently selected value.
   */
  value: string;

  /**
   * Callback fired when the selected item changes.
   */
  onChange: (value: string) => void;
}

/**
 * A segmented control (pill tabs) for selecting one option from a small set.
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useState('dark')
 *
 * <SegmentedControl
 *   items={[
 *     { label: 'Dark', value: 'dark' },
 *     { label: 'Light', value: 'light' },
 *     { label: 'System', value: 'system' },
 *   ]}
 *   value={theme}
 *   onChange={setTheme}
 * />
 * ```
 */
export const SegmentedControl = ({ items, value, onChange }: SegmentedControlProps) => {
  return (
    <div className="segmented-control" role="tablist">
      {items.map(item => (
        <button
          key={item.value}
          role="tab"
          aria-selected={item.value === value}
          className={['segmented-control-item', item.value === value && 'is-active']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

SegmentedControl.displayName = 'SegmentedControl';
