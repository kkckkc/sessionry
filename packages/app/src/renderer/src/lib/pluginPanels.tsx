import type { StatusItemContribution } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'

export const resolveStatusValue = (
  item: StatusItemContribution,
  session: TerminalSessionInfo | null
): string => {
  if (!session) return 'Waiting'

  switch (item.kind) {
    case 'session-state':
      return session.state
    case 'shell':
      return session.shell
    case 'cwd':
      return session.cwd
    case 'connection':
      return session.state === 'ready' ? 'attached' : 'offline'
    default:
      return 'n/a'
  }
}
