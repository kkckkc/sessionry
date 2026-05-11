import type {
  AppPlugin,
  PluginViewModel,
  PluginViewContribution,
  PluginViewDefinition,
  PluginViewSlotId
} from './plugins';

export const normalizePlugins = (plugins: AppPlugin[]): PluginViewModel => {
  const actions = plugins.flatMap(plugin =>
    (plugin.actions ?? []).map(({ run: _run, ...action }) => action)
  );
  const statusItems = plugins.flatMap(plugin => plugin.statusItems ?? []);
  const views = plugins.flatMap(plugin =>
    (plugin.views ?? []).map<PluginViewContribution>((view: PluginViewDefinition) => ({
      ...view,
      icon: view.icon ?? plugin.icon,
      pluginId: plugin.id,
      pluginIcon: plugin.icon,
      viewMode: plugin.viewMode ?? 'single-view'
    }))
  );

  const viewsBySlot = Object.fromEntries(
    views
      .reduce<Map<string, PluginViewContribution[]>>((groups, view) => {
        const group = groups.get(view.slot) ?? [];
        group.push(view);
        groups.set(view.slot, group);
        return groups;
      }, new Map())
      .entries()
  );

  const toolbarActions = actions.filter(action => action.surfaces?.includes('toolbar'));
  
  // Sort toolbar actions: layout:toggle-right goes to the end
  const sortedToolbarActions = toolbarActions.sort((a, b) => {
    if (a.id === 'layout:toggle-right') return 1;
    if (b.id === 'layout:toggle-right') return -1;
    return 0;
  });

  return {
    actions,
    toolbarActionIds: sortedToolbarActions.map(action => action.id),
    statusItems,
    viewsBySlot
  };
};

export const getViewsForSlot = (
  plugins: PluginViewModel,
  slot: PluginViewSlotId
): PluginViewContribution[] => plugins.viewsBySlot[slot] ?? [];

const resolveViewFromCandidates = (
  views: PluginViewContribution[],
  selectedViewId?: string,
  preferredViewId?: string
): PluginViewContribution | null => {
  if (views.length === 0) return null;

  const viewById = new Map(views.map(view => [view.id, view]));

  if (selectedViewId && viewById.has(selectedViewId)) {
    return viewById.get(selectedViewId) ?? null;
  }

  if (preferredViewId && viewById.has(preferredViewId)) {
    return viewById.get(preferredViewId) ?? null;
  }

  return views.find(view => view.isDefault) ?? views[0] ?? null;
};

export const getChildViewsForSlot = (
  plugins: PluginViewModel,
  slot: PluginViewSlotId
): PluginViewContribution[] =>
  getViewsForSlot(plugins, slot).filter(view => view.viewMode !== 'multi-view');

export const resolveChildViewForSlot = (
  plugins: PluginViewModel,
  slot: PluginViewSlotId,
  selectedViewId?: string,
  preferredViewId?: string
): PluginViewContribution | null =>
  resolveViewFromCandidates(getChildViewsForSlot(plugins, slot), selectedViewId, preferredViewId);

export const resolveActiveView = (
  plugins: PluginViewModel,
  slot: PluginViewSlotId,
  selectedViewId?: string,
  preferredViewId?: string
): PluginViewContribution | null => {
  const views = getViewsForSlot(plugins, slot);
  const multiViewHost = views.find(view => view.viewMode === 'multi-view');
  if (multiViewHost) return multiViewHost;

  return resolveViewFromCandidates(views, selectedViewId, preferredViewId);
};
