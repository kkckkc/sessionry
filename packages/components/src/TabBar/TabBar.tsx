import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Tabs } from '@base-ui/react/tabs';
import './TabBar.css';

export interface TabBarItem {
  icon?: ReactNode;
  label: string;
  value: string;
  onClose?: () => void;
}

export interface TabBarProps {
  /**
   * The list of tabs to display.
   */
  items: TabBarItem[];

  /**
   * Visual variant of the tab bar.
   */
  variant: 'primary' | 'secondary' | 'inline';

  /**
   * Controlled active tab value. Used to keep the active tab visible when overflow occurs.
   */
  value?: string;

  /**
   * Callback used by overflow menu items to activate a hidden tab.
   */
  onValueChange?: (value: string) => void;

  /**
   * Accessible label for the tab list.
   */
  ariaLabel?: string;
}

const TAB_GAP_PX = 2;
const OVERFLOW_TRIGGER_FALLBACK_WIDTH = 40;

const areWidthsEqual = (left: Record<string, number>, right: Record<string, number>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(key => left[key] === right[key]);
};

const getVisibleItemIndexes = (
  itemWidths: number[],
  availableWidth: number,
  activeIndex: number
): number[] => {
  if (itemWidths.length === 0) {
    return [];
  }

  let usedWidth = 0;
  let visibleCount = 0;
  for (const width of itemWidths) {
    const nextWidth = visibleCount === 0 ? width : usedWidth + TAB_GAP_PX + width;
    if (nextWidth > availableWidth) {
      break;
    }

    usedWidth = nextWidth;
    visibleCount += 1;
  }

  if (visibleCount >= itemWidths.length) {
    return itemWidths.map((_, index) => index);
  }

  visibleCount = Math.max(1, visibleCount);
  let visibleIndexes = Array.from({ length: visibleCount }, (_, index) => index);

  if (activeIndex >= 0 && !visibleIndexes.includes(activeIndex)) {
    while (visibleIndexes.length > 1) {
      const candidate = [...visibleIndexes.slice(0, -1), activeIndex];
      const candidateWidth = candidate.reduce(
        (total, index, itemIndex) => total + itemWidths[index]! + (itemIndex > 0 ? TAB_GAP_PX : 0),
        0
      );
      if (candidateWidth <= availableWidth) {
        visibleIndexes = candidate;
        break;
      }

      visibleIndexes = visibleIndexes.slice(0, -1);
    }

    if (visibleIndexes.length === 1) {
      visibleIndexes = [activeIndex];
    }
  }

  return visibleIndexes;
};

const handleCloseKeyDown = (
  event: ReactKeyboardEvent<HTMLSpanElement>,
  onClose: () => void
): void => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation();
    onClose();
  }
};

/**
 * A tab bar for switching between panes in a stacked pane group.
 * Renders only the tabs — the add button and action buttons are outside this component.
 *
 * Must be used inside a `Tabs.Root` (from `@base-ui/react/tabs`).
 *
 * @example
 * ```tsx
 * <Tabs.Root value={activeId} onValueChange={setActiveId}>
 *   <TabBar
 *     variant="primary"
 *     value={activeId}
 *     onValueChange={setActiveId}
 *     ariaLabel="Terminal tabs"
 *     items={[
 *       { label: 'Terminal 1', value: 'pane-1', onClose: () => removePane('pane-1') },
 *       { label: 'Terminal 2', value: 'pane-2', onClose: () => removePane('pane-2') },
 *     ]}
 *   />
 * </Tabs.Root>
 * ```
 */
export const TabBar = ({ items, variant, value, onValueChange, ariaLabel }: TabBarProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const overflowTriggerMeasureRef = useRef<HTMLButtonElement | null>(null);
  const itemMeasureRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemWidths, setItemWidths] = useState<Record<string, number>>({});
  const [overflowTriggerWidth, setOverflowTriggerWidth] = useState(OVERFLOW_TRIGGER_FALLBACK_WIDTH);
  const [overflowOpen, setOverflowOpen] = useState(false);

  useLayoutEffect(() => {
    const container = rootRef.current;
    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(container.clientWidth);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    // Measure container and item widths together so overflow calculations
    // always use consistent values (avoids async ResizeObserver lag).
    setContainerWidth(prev => {
      const current = rootRef.current?.clientWidth ?? 0;
      return current === prev ? prev : current;
    });

    const nextWidths = Object.fromEntries(
      items.map(item => [item.value, itemMeasureRefs.current.get(item.value)?.offsetWidth ?? 0])
    );
    if (!areWidthsEqual(itemWidths, nextWidths)) {
      setItemWidths(nextWidths);
    }

    const nextOverflowWidth =
      overflowTriggerMeasureRef.current?.offsetWidth ?? OVERFLOW_TRIGGER_FALLBACK_WIDTH;
    if (nextOverflowWidth !== overflowTriggerWidth) {
      setOverflowTriggerWidth(nextOverflowWidth);
    }
  }, [itemWidths, items, overflowTriggerWidth]);

  useEffect(() => {
    if (!overflowOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOverflowOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [overflowOpen]);

  useEffect(() => {
    setOverflowOpen(false);
  }, []);

  const itemWidthList = items.map(item => itemWidths[item.value] ?? 0);
  const totalTabWidth = itemWidthList.reduce(
    (total, itemWidth, index) => total + itemWidth + (index > 0 ? TAB_GAP_PX : 0),
    0
  );
  const needsOverflow = containerWidth > 0 && totalTabWidth > containerWidth;
  const activeIndex = value == null ? -1 : items.findIndex(item => item.value === value);
  const visibleIndexes = useMemo(() => {
    if (!needsOverflow) {
      return items.map((_, index) => index);
    }

    const availableWidth = Math.max(0, containerWidth - overflowTriggerWidth - TAB_GAP_PX);
    return getVisibleItemIndexes(itemWidthList, availableWidth, activeIndex);
  }, [activeIndex, containerWidth, itemWidthList, items, needsOverflow, overflowTriggerWidth]);

  const visibleSet = new Set(visibleIndexes);
  const visibleItems = items.filter((_, index) => visibleSet.has(index));
  const overflowItems = items.filter((_, index) => !visibleSet.has(index));

  const renderTabContent = (item: TabBarItem) => (
    <>
      {item.icon && <span className="tab-icon">{item.icon}</span>}
      <span className="tab-label">{item.label}</span>
      {item.onClose && (
        // biome-ignore lint/a11y/useSemanticElements: Interactive span with proper ARIA is intentional for styling
        <span
          className="tab-close"
          role="button"
          aria-label={`Close ${item.label}`}
          tabIndex={0}
          onClick={event => {
            event.stopPropagation();
            item.onClose?.();
          }}
          onKeyDown={event => handleCloseKeyDown(event, item.onClose!)}
        >
          ×
        </span>
      )}
    </>
  );

  return (
    <div ref={rootRef} className={`tab-bar tab-bar--${variant}`}>
      <Tabs.List className="tab-bar__list" aria-label={ariaLabel}>
        {visibleItems.map(item => (
          <Tabs.Tab key={item.value} value={item.value} className="tab" data-tab-value={item.value}>
            {renderTabContent(item)}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {overflowItems.length > 0 && (
        <div ref={overflowRef} className="tab-bar__overflow">
          <button
            type="button"
            className="tab-bar__overflow-trigger"
            aria-label={`Show ${overflowItems.length} more tabs`}
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen(open => !open)}
          >
            +{overflowItems.length}
          </button>
          {overflowOpen && (
            <div className="tab-bar__overflow-menu" role="menu">
              {overflowItems.map(item => {
                const isActive = item.value === value;
                return (
                  <div
                    key={item.value}
                    className="tab-bar__overflow-row"
                    data-active={isActive ? '' : undefined}
                  >
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      className="tab-bar__overflow-item"
                      onClick={() => {
                        onValueChange?.(item.value);
                        setOverflowOpen(false);
                      }}
                    >
                      {item.icon && <span className="tab-icon">{item.icon}</span>}
                      <span className="tab-bar__overflow-label">{item.label}</span>
                    </button>
                    {item.onClose && (
                      <button
                        type="button"
                        className="tab-bar__overflow-close"
                        aria-label={`Close ${item.label}`}
                        onClick={event => {
                          event.stopPropagation();
                          item.onClose?.();
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="tab-bar__measurer" aria-hidden="true">
        {items.map(item => (
          <div
            key={item.value}
            ref={element => {
              itemMeasureRefs.current.set(item.value, element);
            }}
            className="tab tab--measure"
            data-tab-measure={item.value}
          >
            {renderTabContent(item)}
          </div>
        ))}
        <button
          ref={overflowTriggerMeasureRef}
          type="button"
          className="tab-bar__overflow-trigger tab-bar__overflow-trigger--measure"
        >
          +99
        </button>
      </div>
    </div>
  );
};

TabBar.displayName = 'TabBar';
