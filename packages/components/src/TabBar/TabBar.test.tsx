import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from '@base-ui/react/tabs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { TabBar } from './TabBar';

const widthByValue: Record<string, number> = {
  'tab-1': 80,
  'tab-2': 80,
  'tab-3': 80,
  'tab-4': 80
};

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  class ResizeObserverMock {
    observe(): void {}
    disconnect(): void {}
    unobserve(): void {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      const element = this as HTMLElement;
      if (element.classList.contains('tab-bar')) {
        return 210;
      }

      return 0;
    }
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      const element = this as HTMLElement;
      if (element.classList.contains('tab-bar__overflow-trigger')) {
        return 40;
      }

      const value = element.dataset.tabMeasure;
      return value ? (widthByValue[value] ?? 0) : 0;
    }
  });
});

afterAll(() => {
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  }
  if (originalOffsetWidth) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
  }
  globalThis.ResizeObserver = originalResizeObserver;
});

describe('TabBar', () => {
  const items = [
    { label: 'Tab 1', value: 'tab-1' },
    { label: 'Tab 2', value: 'tab-2' },
    { label: 'Tab 3', value: 'tab-3' }
  ];

  it('moves overflowing tabs into a dropdown and activates them through onValueChange', () => {
    const onValueChange = vi.fn();

    render(
      <Tabs.Root value="tab-1" onValueChange={onValueChange}>
        <TabBar
          items={items}
          variant="primary"
          value="tab-1"
          onValueChange={onValueChange}
          ariaLabel="Example tabs"
        />
      </Tabs.Root>
    );

    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Tab 3' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 more tabs' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tab 3' }));

    expect(onValueChange).toHaveBeenCalledWith('tab-3');
  });

  it('keeps the active tab visible when it would otherwise overflow out of view', () => {
    render(
      <Tabs.Root value="tab-3" onValueChange={() => {}}>
        <TabBar
          items={items}
          variant="secondary"
          value="tab-3"
          onValueChange={() => {}}
          ariaLabel="Sidebar tabs"
        />
      </Tabs.Root>
    );

    expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Tab 2' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 1 more tabs' })).toBeInTheDocument();
  });
});
