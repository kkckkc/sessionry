import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const sendSync = vi.fn();
const on = vi.fn();
const removeListener = vi.fn();
const exposeInMainWorld = vi.fn();
const getPathForFile = vi.fn();

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke, sendSync, on, removeListener, send: vi.fn() },
  webUtils: { getPathForFile }
}));

describe('preload workspace bridge', () => {
  beforeEach(() => {
    invoke.mockReset();
    sendSync.mockReset();
    on.mockReset();
    removeListener.mockReset();
    exposeInMainWorld.mockReset();
    getPathForFile.mockReset();
  });

  it('exposes sync reads, async commands, and event subscriptions', async () => {
    sendSync.mockReturnValue({ projects: [], sessions: [], paneGroups: [], panes: [] });
    getPathForFile.mockReturnValue('/tmp/My File.txt');

    await import('./index');

    const [, api] = exposeInMainWorld.mock.calls[0];
    await api.actions.list();
    await api.actions.execute({ actionId: 'terminal:clear', source: 'toolbar' });
    api.workspace.read();
    await api.workspace.executeCommand({ type: 'project.remove', projectId: 'project-1' });
    await api.readFile('/tmp/project/src/index.ts');
    await api.writeFile('/tmp/project/src/index.ts', 'export {}');
    await api.vcs.getStatus('/tmp/project');
    await api.vcs.getDiff('/tmp/project', { path: 'src/index.ts', status: 'M' });
    await api.vcs.stageFiles('/tmp/project', [{ path: 'src/index.ts', status: 'M' }]);
    await api.vcs.commit('/tmp/project', 'Add VCS commit controls');

    expect(invoke).toHaveBeenCalledWith('actions:list');
    expect(invoke).toHaveBeenCalledWith('actions:execute', {
      actionId: 'terminal:clear',
      source: 'toolbar'
    });
    expect(sendSync).toHaveBeenCalledWith('workspace:read');
    expect(invoke).toHaveBeenCalledWith('workspace:command', {
      type: 'project.remove',
      projectId: 'project-1'
    });
    expect(invoke).toHaveBeenCalledWith('fs:read-file', '/tmp/project/src/index.ts');
    expect(invoke).toHaveBeenCalledWith('fs:write-file', '/tmp/project/src/index.ts', 'export {}');
    expect(invoke).toHaveBeenCalledWith('vcs:status', '/tmp/project');
    expect(invoke).toHaveBeenCalledWith('vcs:diff', '/tmp/project', {
      path: 'src/index.ts',
      status: 'M'
    });
    expect(invoke).toHaveBeenCalledWith('vcs:stage-files', '/tmp/project', [
      { path: 'src/index.ts', status: 'M' }
    ]);
    expect(invoke).toHaveBeenCalledWith(
      'vcs:commit',
      '/tmp/project',
      'Add VCS commit controls'
    );
    expect(api.getPathForDroppedFile({ name: 'My File.txt' } as File)).toBe('/tmp/My File.txt');
    expect(getPathForFile).toHaveBeenCalledWith({ name: 'My File.txt' });
    expect(api.formatPathForTerminal('/tmp/project/src/My File.ts', '/tmp/project')).toBe(
      "'src/My File.ts'"
    );
    expect(api.formatPathForTerminal('/tmp/Other File.ts', '/tmp/project')).toBe(
      "'/tmp/Other File.ts'"
    );

    const listener = vi.fn();
    const unsubscribe = api.workspace.onEvent(listener);
    const wrapped = on.mock.calls[0][1];
    wrapped({}, { type: 'project.updated', entityType: 'project', entityId: 'project-1' });
    unsubscribe();

    expect(on).toHaveBeenCalledWith('workspace:event', expect.any(Function));
    expect(listener).toHaveBeenCalledWith({
      type: 'project.updated',
      entityType: 'project',
      entityId: 'project-1'
    });
    expect(removeListener).toHaveBeenCalledWith('workspace:event', wrapped);
  });
});
