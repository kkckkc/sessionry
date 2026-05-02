import React, { useCallback, useEffect, useState } from 'react'
import { TbChevronDown, TbChevronRight, TbFile } from 'react-icons/tb'
import type { WorkspaceApi } from '@sessionry/plugin-api'
import './styles.css'

interface FileEntry {
  name: string
  isDirectory: boolean
}

interface FileBrowserViewProps {
  workspace: WorkspaceApi
}

interface TreeNodeProps {
  name: string
  isDirectory: boolean
  fullPath: string
  depth: number
}

const TreeNode: React.FC<TreeNodeProps> = ({ name, isDirectory, fullPath, depth }) => {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState<FileEntry[] | null>(null)

  const handleToggle = useCallback(async () => {
    if (!isDirectory) return
    if (!open && children === null) {
      const entries = await window.terminalApp.readDirectory(fullPath)
      const sorted = [...entries].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      setChildren(sorted)
    }
    setOpen((prev) => !prev)
  }, [isDirectory, open, children, fullPath])

  const paddingLeft = 10 + depth * 14

  return (
    <div className="file-tree-node">
      <div
        className="file-tree-row"
        style={{ paddingLeft }}
        onClick={isDirectory ? handleToggle : undefined}
      >
        <span className="file-tree-chevron">
          {isDirectory ? (open ? <TbChevronDown /> : <TbChevronRight />) : null}
        </span>
        {!isDirectory && (
          <span className="file-tree-icon file-tree-icon--file">
            <TbFile />
          </span>
        )}
        <span className={isDirectory ? 'file-tree-name file-tree-name--dir' : 'file-tree-name'}>{name}</span>
      </div>
      {isDirectory && open && children !== null && (
        <div className="file-tree-children">
          {children.map((child) => (
            <TreeNode
              key={child.name}
              name={child.name}
              isDirectory={child.isDirectory}
              fullPath={`${fullPath}/${child.name}`}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const FileBrowserView: React.FC<FileBrowserViewProps> = ({ workspace }) => {
  const [, setRefreshKey] = useState(0)
  const [rootEntries, setRootEntries] = useState<FileEntry[] | null>(null)
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)

  useEffect(() => {
    return workspace.subscribeAll(() => setRefreshKey((k) => k + 1))
  }, [workspace])

  const snapshot = workspace.snapshot
  const activeSession = snapshot.activeSessionId
    ? snapshot.sessions.find((s) => s.id === snapshot.activeSessionId)
    : snapshot.sessions[0]
  const folder = activeSession?.folder ?? null

  useEffect(() => {
    if (folder === currentFolder) return
    setCurrentFolder(folder)
    setRootEntries(null)
    if (!folder) return
    window.terminalApp.readDirectory(folder).then((entries) => {
      const sorted = [...entries].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      setRootEntries(sorted)
    })
  }, [folder, currentFolder])

  if (!folder || rootEntries === null) {
    return (
      <div className="file-browser">
        <div className="file-browser-empty">
          {!folder ? 'No active session' : 'Loading...'}
        </div>
      </div>
    )
  }

  return (
    <div className="file-browser">
      {rootEntries.map((entry) => (
        <TreeNode
          key={entry.name}
          name={entry.name}
          isDirectory={entry.isDirectory}
          fullPath={`${folder}/${entry.name}`}
          depth={0}
        />
      ))}
    </div>
  )
}
