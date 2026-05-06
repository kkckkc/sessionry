import type { RendererAppPlugin } from '@sessionry/plugin-api';

import samplePlugin from '.';

function SampleView() {
  return (
    <div style={{ padding: '1rem' }}>
      <h2>Sample Plugin</h2>
      <p>Replace this component to build your plugin&apos;s UI.</p>
    </div>
  );
}

const sampleRendererPlugin: RendererAppPlugin = {
  ...samplePlugin,
  views: [
    {
      ...samplePlugin.views![0],
      component: SampleView
    }
  ],
  // TODO: Why do we need to make this undefined
  settingsView: undefined
};

export default sampleRendererPlugin;
