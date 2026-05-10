/**
 * Tab Navigation Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation } from './TabNavigation';

describe('TabNavigation', () => {
  it('renders all three tabs', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    expect(screen.getByText('Installed')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Updates')).toBeInTheDocument();
  });

  it('marks the active tab correctly', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="available" onTabChange={onTabChange} />);

    const availableTab = screen.getByRole('tab', { name: /Available/ });
    expect(availableTab).toHaveAttribute('aria-selected', 'true');
    expect(availableTab).toHaveClass('tab-navigation__tab--active');
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    const availableTab = screen.getByText('Available');
    fireEvent.click(availableTab);

    expect(onTabChange).toHaveBeenCalledWith('available');
  });

  it('does not call onTabChange when clicking the active tab', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    const installedTab = screen.getByText('Installed');
    fireEvent.click(installedTab);

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('displays installed count badge', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} installedCount={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays updates count badge', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} updatesCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not display badge when count is 0', () => {
    const onTabChange = vi.fn();

    const { container } = render(
      <TabNavigation
        activeTab="installed"
        onTabChange={onTabChange}
        installedCount={0}
        updatesCount={0}
      />
    );

    // Should not have any badges
    const badges = container.querySelectorAll('.tab-navigation__badge');
    expect(badges).toHaveLength(0);
  });

  it('does not display badge when count is undefined', () => {
    const onTabChange = vi.fn();

    const { container } = render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    // Should not have any badges
    const badges = container.querySelectorAll('.tab-navigation__badge');
    expect(badges).toHaveLength(0);
  });

  it('disables all tabs when disabled prop is true', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} disabled={true} />);

    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toBeDisabled();
    });
  });

  it('does not call onTabChange when disabled', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} disabled={true} />);

    const availableTab = screen.getByText('Available');
    fireEvent.click(availableTab);

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation with Enter key', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    const availableTab = screen.getByText('Available');
    fireEvent.keyDown(availableTab, { key: 'Enter', code: 'Enter' });

    expect(onTabChange).toHaveBeenCalledWith('available');
  });

  it('supports keyboard navigation with Space key', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    const availableTab = screen.getByText('Available');
    fireEvent.keyDown(availableTab, { key: ' ', code: 'Space' });

    expect(onTabChange).toHaveBeenCalledWith('available');
  });

  it('has proper ARIA attributes', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Plugin views');

    const installedTab = screen.getByRole('tab', { name: /Installed/ });
    expect(installedTab).toHaveAttribute('id', 'tab-installed');
    expect(installedTab).toHaveAttribute('aria-controls', 'panel-installed');
    expect(installedTab).toHaveAttribute('aria-selected', 'true');
  });

  it('sets correct tabIndex for active and inactive tabs', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="installed" onTabChange={onTabChange} />);

    const installedTab = screen.getByRole('tab', { name: /Installed/ });
    const availableTab = screen.getByRole('tab', { name: /Available/ });
    const updatesTab = screen.getByRole('tab', { name: /Updates/ });

    expect(installedTab).toHaveAttribute('tabIndex', '0');
    expect(availableTab).toHaveAttribute('tabIndex', '-1');
    expect(updatesTab).toHaveAttribute('tabIndex', '-1');
  });
});
