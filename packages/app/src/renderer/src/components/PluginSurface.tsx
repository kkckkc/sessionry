import type { ReactNode } from 'react';

interface PluginSurfaceProps {
  pluginId: string;
  surface: 'sidebar' | 'workspace' | 'pane' | 'settings';
  children: ReactNode;
  className?: string;
  slot?: string;
  viewId?: string;
}

export const PluginSurface = ({
  pluginId,
  surface,
  children,
  className,
  slot,
  viewId
}: PluginSurfaceProps) => {
  const classes = ['plugin-surface', className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      data-plugin-id={pluginId}
      data-plugin-surface={surface}
      data-plugin-slot={slot}
      data-plugin-view-id={viewId}
    >
      {children}
    </div>
  );
};
