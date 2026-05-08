/**
 * Test Setup for Plugin Manager Components
 */

import '@testing-library/jest-dom';
import { createMockTerminalApp } from '../../test-utils/mockTerminalApp';

// Mock Electron IPC using centralized mock factory
global.window = global.window || {};
global.window.terminalApp = createMockTerminalApp();
