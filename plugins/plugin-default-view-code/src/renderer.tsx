import { EditorState, type Extension, Compartment } from '@codemirror/state'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import { EditorView, keymap } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { basicSetup } from 'codemirror'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PaneViewProps, RendererAppPlugin, ThemeDefinition } from '@sessionry/plugin-api'

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

/**
 * Creates syntax highlighting theme using theme's semantic token colors.
 * No more manual mapping from ANSI colors - themes define semantic tokens directly.
 */
const getSyntaxHighlighting = (theme: ThemeDefinition): Extension => {
  const { syntax } = theme
  
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: syntax.keyword },
      { tag: [t.function(t.variableName), t.labelName], color: syntax.function },
      { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: syntax.variable },
      { tag: [t.typeName, t.className, t.namespace], color: syntax.type },
      { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: syntax.constant },
      { tag: [t.processingInstruction, t.string, t.inserted], color: syntax.string },
      { tag: [t.number, t.changed, t.annotation, t.modifier, t.self], color: syntax.number },
      { tag: [t.meta, t.comment], color: syntax.comment, fontStyle: 'italic' },
      { tag: [t.operator, t.operatorKeyword], color: syntax.operator },
      { tag: [t.definition(t.name), t.separator], color: syntax.punctuation },
      { tag: [t.url, t.escape, t.regexp, t.special(t.string)], color: syntax.escape },
      { tag: t.link, color: syntax.link, textDecoration: 'underline' },
      { tag: t.heading, fontWeight: 'bold', color: syntax.heading },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: syntax.constant },
      { tag: t.strong, fontWeight: 'bold', color: syntax.strong },
      { tag: t.emphasis, fontStyle: 'italic', color: syntax.emphasis },
      { tag: t.strikethrough, textDecoration: 'line-through' },
      { tag: t.invalid, color: syntax.invalid }
    ])
  )
}

// TERMINAL_THEMES removed - now fetched from theme registry via IPC

/**
 * Creates editor theme using theme's ANSI colors for UI elements.
 */
const getEditorTheme = (theme: ThemeDefinition, bgOverride?: string): Extension => {
  const { ansi } = theme
  const backgroundColor = bgOverride || ansi.background
  const foregroundColor = ansi.foreground
  const cursorColor = ansi.cursor
  const selectionColor = ansi.selectionBackground
  
  return EditorView.theme({
    '&': {
      backgroundColor,
      color: foregroundColor,
      fontFamily: '"BerkeleyMono Nerd Font Mono Plus Font Awesome Plus Octicons Plus Power Symbols Plus Codicons Plus Pomicons Plus Font Logos Plus Material Design Icons Plus Weather Icons", "SF Mono", "JetBrains Mono", ui-monospace, monospace',
      fontSize: '11px'
    },
    '.cm-content': {
      caretColor: cursorColor
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: cursorColor
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: selectionColor
    },
    '.cm-activeLine': {
      backgroundColor: `${ansi.brightBlack}40` // Add alpha
    },
    '.cm-gutters': {
      backgroundColor: `${ansi.black}80`,
      borderRight: `1px solid ${ansi.brightBlack}`
    },
    '.cm-activeLineGutter': {
      backgroundColor: `${ansi.brightBlack}40`
    }
  }, { dark: true })
}

type CodePaneEditorHost = HTMLDivElement & {
  __codePaneEditorView?: EditorView
  __codePaneSave?: () => Promise<void>
}

const CodePaneView = ({ pane, workspace, onRegisterFocusHandler }: PaneViewProps) => {
  const filePath = typeof pane.state.filePath === 'string' ? pane.state.filePath : ''
  const paneIdRef = useRef(pane.id)
  const editorRootRef = useRef<CodePaneEditorHost | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null)
  const savedContentRef = useRef<string>('')
  const themeCompartmentRef = useRef<Compartment>(new Compartment())
  const syntaxCompartmentRef = useRef<Compartment>(new Compartment())
  const saveKeymapRef = useRef<Extension | null>(null)
  const updateListenerRef = useRef<Extension | null>(null)
  const [content, setContent] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  paneIdRef.current = pane.id

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
      const isDirtyNow = currentContent !== savedContentRef.current
      // Update pane state with dirty status
      const paneHandle = workspace.getPane(paneIdRef.current)
      const currentState = paneHandle?.data.state
      if (currentState && currentState.isDirty !== isDirtyNow) {
        await paneHandle?.update({ state: { ...currentState, isDirty: isDirtyNow } })
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save this file.')
    } finally {
      setIsSaving(false)
    }
  }, [filePath, isSaving, status, workspace])

  saveHandlerRef.current = handleSave

  useEffect(() => {
    if (!filePath) {
      setStatus('error')
      setErrorMessage('This code pane is missing a file path.')
      setContent('')
      savedContentRef.current = ''
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)

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
      const isDirtyNow = update.state.doc.toString() !== savedContentRef.current
      // Update pane state with dirty status (debounced to avoid excessive updates)
      const paneHandle = workspace.getPane(paneIdRef.current)
      const currentState = paneHandle?.data.state
      if (currentState && currentState.isDirty !== isDirtyNow) {
        void paneHandle?.update({ state: { ...currentState, isDirty: isDirtyNow } })
      }
    })

    // Store extensions in refs so they're accessible in applyEditorTheme
    saveKeymapRef.current = saveKeymap
    updateListenerRef.current = updateListener

    const applyEditorTheme = async () => {
      if (!editorViewRef.current) return
      
      const themeId = document.documentElement.getAttribute('data-theme') || 'default'
      const theme = await window.terminalApp.themes.getTheme(themeId)
      
      if (!theme) {
        console.warn(`[CodeEditor] Theme "${themeId}" not found`)
        return
      }
      
      console.log('[CodeEditor] Applying theme:', themeId)
      
      const bgOverride = getComputedStyle(document.documentElement)
        .getPropertyValue('--terminal-surface-bg').trim()
      
      const newTheme = getEditorTheme(theme, bgOverride)
      const newSyntaxTheme = getSyntaxHighlighting(theme)
      
      try {
        editorViewRef.current.dispatch({
          effects: [
            themeCompartmentRef.current.reconfigure(newTheme),
            syntaxCompartmentRef.current.reconfigure(newSyntaxTheme)
          ]
        })
        console.log('[CodeEditor] Theme applied successfully')
      } catch (error) {
        console.error('[CodeEditor] Error applying theme:', error)
      }
    }

    const initializeEditor = async () => {
      // Load theme before creating editor
      const themeId = document.documentElement.getAttribute('data-theme') || 'default'
      const theme = await window.terminalApp.themes.getTheme(themeId)
      
      if (!theme) {
        console.warn(`[CodeEditor] Theme "${themeId}" not found, using default`)
      }
      
      const bgOverride = getComputedStyle(document.documentElement)
        .getPropertyValue('--terminal-surface-bg').trim()
      
      const initialTheme = theme ? getEditorTheme(theme, bgOverride) : []
      const initialSyntaxTheme = theme ? getSyntaxHighlighting(theme) : []

      // Create editor with initial theme
      const state = EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          themeCompartmentRef.current.of(initialTheme),
          syntaxCompartmentRef.current.of(initialSyntaxTheme),
          saveKeymap,
          updateListener,
          ...(languageExtension ? [languageExtension] : [])
        ]
      })

      const view = new EditorView({
        state,
        parent: editorRootRef.current!
      })

      editorViewRef.current = view
      editorRootRef.current!.__codePaneEditorView = view
      editorRootRef.current!.__codePaneSave = () => handleSave()
      onRegisterFocusHandler?.(() => view.focus())

      // Set up theme observer after editor is created
      const themeObserver = new MutationObserver((mutations) => {
        const relevantMutation = mutations.some((mutation) => 
          mutation.attributeName === 'class' || 
          mutation.attributeName === 'data-theme'
        )
        if (relevantMutation) {
          console.log('[CodeEditor] Theme change detected, applying new theme...')
          void applyEditorTheme()
        }
      })
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      })

      return { view, themeObserver }
    }

    let cleanup: { view: EditorView; themeObserver: MutationObserver } | null = null
    
    void initializeEditor().then((result) => {
      cleanup = result
    })

    return () => {
      if (cleanup) {
        cleanup.themeObserver.disconnect()
        onRegisterFocusHandler?.(() => {})
        if (editorRootRef.current?.__codePaneEditorView === cleanup.view) {
          delete editorRootRef.current.__codePaneEditorView
        }
        if (editorRootRef.current?.__codePaneSave) {
          delete editorRootRef.current.__codePaneSave
        }
        if (editorViewRef.current === cleanup.view) {
          editorViewRef.current = null
        }
        cleanup.view.destroy()
      }
    }
  }, [content, languageExtension, onRegisterFocusHandler, status, handleSave])

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
