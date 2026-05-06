/**
 * Status Bar Component
 *
 * Displays operation status, progress, and feedback messages.
 */

import type { OperationProgress } from './PluginManagerContext';
import './StatusBar.css';

/**
 * Status Bar Props
 */
export interface StatusBarProps {
  operation: OperationProgress;
  onDismiss?: () => void;
}

/**
 * Get status icon
 */
function getStatusIcon(status: OperationProgress['status']): string {
  switch (status) {
    case 'loading':
      return '⏳';
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    default:
      return '';
  }
}

/**
 * Get status color class
 */
function getStatusColorClass(status: OperationProgress['status']): string {
  switch (status) {
    case 'loading':
      return 'status-bar--loading';
    case 'success':
      return 'status-bar--success';
    case 'error':
      return 'status-bar--error';
    default:
      return '';
  }
}

/**
 * Status Bar Component
 */
export function StatusBar({ operation, onDismiss }: StatusBarProps) {
  const { status, message, error, progress } = operation;

  // Don't render if idle
  if (status === 'idle') {
    return null;
  }

  const icon = getStatusIcon(status);
  const colorClass = getStatusColorClass(status);
  const displayMessage = error || message;
  const showProgress = status === 'loading' && progress !== undefined;

  return (
    <div className={`status-bar ${colorClass}`} role="status" aria-live="polite">
      <div className="status-bar__content">
        {icon && (
          <span className="status-bar__icon" aria-hidden="true">
            {icon}
          </span>
        )}

        <div className="status-bar__text">
          {displayMessage && <span className="status-bar__message">{displayMessage}</span>}

          {showProgress && (
            <div className="status-bar__progress-wrapper">
              <div className="status-bar__progress-bar">
                <div
                  className="status-bar__progress-fill"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Operation progress"
                />
              </div>
              <span className="status-bar__progress-text">{progress}%</span>
            </div>
          )}
        </div>

        {(status === 'success' || status === 'error') && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="status-bar__dismiss"
            aria-label="Dismiss message"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Loading spinner for operations without progress */}
      {status === 'loading' && !showProgress && (
        <div className="status-bar__spinner" aria-hidden="true">
          <svg
            className="status-bar__spinner-svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="30 10"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
