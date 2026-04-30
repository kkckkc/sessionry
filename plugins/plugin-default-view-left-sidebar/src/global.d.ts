interface Window {
  terminalApp: {
    showFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  }
}
