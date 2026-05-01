import type { Preview } from '@storybook/react'
import '@sessionry/design-tokens/theme.css'
import '../src/style.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#1a1a1c'
        },
        {
          name: 'chrome',
          value: '#242426'
        },
        {
          name: 'workspace',
          value: '#0c0c0e'
        }
      ]
    },
    layout: 'centered'
  }
}

export default preview
