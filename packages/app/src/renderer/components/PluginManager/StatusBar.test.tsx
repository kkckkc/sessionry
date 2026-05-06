/**
 * Status Bar Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import type { OperationProgress } from './PluginManagerContext';

describe('StatusBar', () => {
  it('does not render when status is idle', () => {
    const operation: OperationProgress = {
      operation: 'search',
      status: 'idle'
    };

    const { container } = render(<StatusBar operation={operation} />);
    expect(container.firstChild).toBeNull();
  });

  describe('Loading State', () => {
    it('renders loading state with message', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'loading',
        message: 'Installing plugin...'
      };

      render(<StatusBar operation={operation} />);

      expect(screen.getByText('Installing plugin...')).toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('shows progress bar when progress is provided', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'loading',
        message: 'Downloading...',
        progress: 45
      };

      render(<StatusBar operation={operation} />);

      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('shows spinner when progress is not provided', () => {
      const operation: OperationProgress = {
        operation: 'search',
        status: 'loading',
        message: 'Searching...'
      };

      const { container } = render(<StatusBar operation={operation} />);

      const spinner = container.querySelector('.status-bar__spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show dismiss button when loading', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'loading',
        message: 'Installing...'
      };

      render(<StatusBar operation={operation} />);

      expect(screen.queryByLabelText('Dismiss message')).not.toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('renders success state with message', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'success',
        message: 'Plugin installed successfully'
      };

      render(<StatusBar operation={operation} />);

      expect(screen.getByText('Plugin installed successfully')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('shows dismiss button when success', () => {
      const onDismiss = vi.fn();
      const operation: OperationProgress = {
        operation: 'install',
        status: 'success',
        message: 'Success!'
      };

      render(<StatusBar operation={operation} onDismiss={onDismiss} />);

      expect(screen.getByLabelText('Dismiss message')).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      const operation: OperationProgress = {
        operation: 'install',
        status: 'success',
        message: 'Success!'
      };

      render(<StatusBar operation={operation} onDismiss={onDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss message');
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('applies success color class', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'success',
        message: 'Success!'
      };

      const { container } = render(<StatusBar operation={operation} />);

      const statusBar = container.querySelector('.status-bar');
      expect(statusBar).toHaveClass('status-bar--success');
    });
  });

  describe('Error State', () => {
    it('renders error state with error message', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'error',
        error: 'Installation failed: Network error'
      };

      render(<StatusBar operation={operation} />);

      expect(screen.getByText('Installation failed: Network error')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('shows error message over regular message', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'error',
        message: 'Installing...',
        error: 'Failed!'
      };

      render(<StatusBar operation={operation} />);

      expect(screen.getByText('Failed!')).toBeInTheDocument();
      expect(screen.queryByText('Installing...')).not.toBeInTheDocument();
    });

    it('shows dismiss button when error', () => {
      const onDismiss = vi.fn();
      const operation: OperationProgress = {
        operation: 'install',
        status: 'error',
        error: 'Error!'
      };

      render(<StatusBar operation={operation} onDismiss={onDismiss} />);

      expect(screen.getByLabelText('Dismiss message')).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      const operation: OperationProgress = {
        operation: 'install',
        status: 'error',
        error: 'Error!'
      };

      render(<StatusBar operation={operation} onDismiss={onDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss message');
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('applies error color class', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'error',
        error: 'Error!'
      };

      const { container } = render(<StatusBar operation={operation} />);

      const statusBar = container.querySelector('.status-bar');
      expect(statusBar).toHaveClass('status-bar--error');
    });
  });

  describe('Accessibility', () => {
    it('has proper role and aria-live attributes', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'loading',
        message: 'Loading...'
      };

      render(<StatusBar operation={operation} />);

      const statusBar = screen.getByRole('status');
      expect(statusBar).toHaveAttribute('aria-live', 'polite');
    });

    it('progress bar has proper ARIA attributes', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'loading',
        progress: 75
      };

      render(<StatusBar operation={operation} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Operation progress');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('icons are hidden from screen readers', () => {
      const operation: OperationProgress = {
        operation: 'install',
        status: 'success',
        message: 'Success!'
      };

      const { container } = render(<StatusBar operation={operation} />);

      const icon = container.querySelector('.status-bar__icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Different Operations', () => {
    it('handles search operation', () => {
      const operation: OperationProgress = {
        operation: 'search',
        status: 'loading',
        message: 'Searching plugins...'
      };

      render(<StatusBar operation={operation} />);
      expect(screen.getByText('Searching plugins...')).toBeInTheDocument();
    });

    it('handles install operation', () => {
      const operation: OperationProgress = {
        operation: 'install',
        pluginId: 'test-plugin',
        status: 'loading',
        message: 'Installing test-plugin...'
      };

      render(<StatusBar operation={operation} />);
      expect(screen.getByText('Installing test-plugin...')).toBeInTheDocument();
    });

    it('handles uninstall operation', () => {
      const operation: OperationProgress = {
        operation: 'uninstall',
        pluginId: 'test-plugin',
        status: 'success',
        message: 'Plugin uninstalled'
      };

      render(<StatusBar operation={operation} />);
      expect(screen.getByText('Plugin uninstalled')).toBeInTheDocument();
    });

    it('handles update operation', () => {
      const operation: OperationProgress = {
        operation: 'update',
        pluginId: 'test-plugin',
        status: 'loading',
        progress: 50,
        message: 'Updating plugin...'
      };

      render(<StatusBar operation={operation} />);
      expect(screen.getByText('Updating plugin...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });
});
