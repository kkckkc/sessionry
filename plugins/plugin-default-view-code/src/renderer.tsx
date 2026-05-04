import React, { useEffect, useState } from 'react'

import type { PaneViewProps, RendererAppPlugin } from '@sessionry/plugin-api'

import { codePanePlugin } from '.'
import './styles.css'

const codeView = codePanePlugin.views?.[0]

if (!codeView) {
  throw new Error('codePanePlugin must register a pane view.')
}

const CodePaneView = ({ pane }: PaneViewProps) => {
  const filePath = typeof pane.state.filePath === 'string' ? pane.state.filePath : ''
  const [content, setContent] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) {
      setStatus('error')
      setErrorMessage('This code pane is missing a file path.')
      setContent('')
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)

    void window.terminalApp.readFile(filePath).then((nextContent) => {
      if (cancelled) return
      setContent(nextContent)
      setStatus('ready')
    }).catch((error: unknown) => {
      if (cancelled) return
      setContent('')
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unable to read this file.')
    })

    return () => {
      cancelled = true
    }
  }, [filePath])

  return React.createElement(
    'section',
    { className: 'code-pane' },
    status === 'loading'
      ? React.createElement('div', { className: 'code-pane-status' }, 'Loading file…')
      : null,
    status === 'error'
      ? React.createElement('div', { className: 'code-pane-status is-error' }, errorMessage)
      : null,
    status === 'ready'
      ? React.createElement('pre', { className: 'code-pane-content' }, content)
      : null
  )
}

export const codePaneRendererPlugin: RendererAppPlugin = {
  id: codePanePlugin.id,
  name: codePanePlugin.name,
  views: [
    {
      ...codeView,
      component: CodePaneView
    }
  ]
}

export { CodePaneView }

export default codePaneRendererPlugin
