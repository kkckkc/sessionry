import { EditorState } from '@codemirror/state'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PaneViewProps, RendererAppPlugin } from '@sessionry/plugin-api'

import { codePanePlugin } from '.'
import './styles.css'

const codeView = codePanePlugin.views?.[0]

if (!codeView) {
  throw new Error('codePanePlugin must register a pane view.')
}

const getFileName = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) ?? filePath
}

const getFileExtension = (filePath: string): string => {
  const fileName = getFileName(filePath)
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ''
}

type CodePaneEditorHost = HTMLDivElement & {
  __codePaneEditorView?: EditorView
  __codePaneSave?: () => Promise<void>
}

const CodePaneView = ({ pane, onRegisterFocusHandler }: PaneViewProps) => {
  const filePath = typeof pane.state.filePath === 'string' ? pane.state.filePath : ''
  const editorRootRef = useRef<CodePaneEditorHost | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null)
  const savedContentRef = useRef<string>('')
  const [content, setContent] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const languageExtension = useMemo(() => {
    const extension = getFileExtension(filePath)
    switch (extension) {
      case '.ts':
      case '.tsx':
        return javascript({ jsx: extension === '.tsx', typescript: true })
      case '.js':
      case '.jsx':
        return javascript({ jsx: extension === '.jsx' })
      case '.json':
        return json()
      case '.css':
        return css()
      case '.html':
        return html()
      case '.md':
        return markdown()
      case '.yml':
      case '.yaml':
        return yaml()
      default:
        return null
    }
  }, [filePath])

  const handleSave = useCallback(async () => {
    if (!filePath || !editorViewRef.current || status !== 'ready' || isSaving) return

    const nextContent = editorViewRef.current.state.doc.toString()
    setIsSaving(true)
    setErrorMessage(null)

    try {
      await window.terminalApp.writeFile(filePath, nextContent)
      savedContentRef.current = nextContent
      const currentContent = editorViewRef.current.state.doc.toString()
      setIsDirty(currentContent !== savedContentRef.current)
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save this file.')
    } finally {
      setIsSaving(false)
    }
  }, [filePath, isSaving, status])

  saveHandlerRef.current = handleSave

  useEffect(() => {
    if (!filePath) {
      setStatus('error')
      setErrorMessage('This code pane is missing a file path.')
      setContent('')
      savedContentRef.current = ''
      setIsDirty(false)
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)
    setIsDirty(false)

    void window.terminalApp.readFile(filePath).then((nextContent) => {
      if (cancelled) return
      setContent(nextContent)
      savedContentRef.current = nextContent
      setStatus('ready')
    }).catch((error: unknown) => {
      if (cancelled) return
      setContent('')
      savedContentRef.current = ''
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unable to read this file.')
    })

    return () => {
      cancelled = true
    }
  }, [filePath])

  useEffect(() => {
    if (status !== 'ready' || !editorRootRef.current) return

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          void saveHandlerRef.current?.()
          return true
        }
      }
    ])

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      setErrorMessage(null)
      setIsDirty(update.state.doc.toString() !== savedContentRef.current)
    })

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        saveKeymap,
        updateListener,
        ...(languageExtension ? [languageExtension] : [])
      ]
    })

    const view = new EditorView({
      state,
      parent: editorRootRef.current
    })

    editorViewRef.current = view
    editorRootRef.current.__codePaneEditorView = view
    editorRootRef.current.__codePaneSave = () => handleSave()
    onRegisterFocusHandler?.(() => view.focus())

    return () => {
      onRegisterFocusHandler?.(() => {})
      if (editorRootRef.current?.__codePaneEditorView === view) {
        delete editorRootRef.current.__codePaneEditorView
      }
      if (editorRootRef.current?.__codePaneSave) {
        delete editorRootRef.current.__codePaneSave
      }
      if (editorViewRef.current === view) {
        editorViewRef.current = null
      }
      view.destroy()
    }
  }, [content, languageExtension, onRegisterFocusHandler, status])

  return React.createElement(
    'section',
    { className: 'code-pane' },
    status === 'loading'
      ? React.createElement('div', { className: 'code-pane-status' }, 'Loading file…')
      : null,
    isSaving
      ? React.createElement('div', { className: 'code-pane-status' }, 'Saving…')
      : null,
    errorMessage
      ? React.createElement('div', { className: 'code-pane-status is-error' }, errorMessage)
      : null,
    status === 'ready' && isDirty && !isSaving && !errorMessage
      ? React.createElement('div', { className: 'code-pane-status' }, 'Unsaved changes')
      : null,
    status === 'ready'
      ? React.createElement('div', { className: 'code-pane-editor', ref: editorRootRef })
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
