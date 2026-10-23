/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchWorkspaces } from '../api/workspaces'
import type { Workspace } from '../types/workspace'

const ACTIVE_WORKSPACE_KEY = 'clovars.activeWorkspaceId'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeId: string | null
  activeWorkspace: Workspace | null
  loading: boolean
  error: string | null
  refresh: (preferredId?: string) => Promise<void>
  setActiveId: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  children,
  enabled = true
}: {
  children: React.ReactNode
  enabled?: boolean
}): React.JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (preferredId?: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchWorkspaces()
      setWorkspaces(list)

      const storedId = preferredId ?? localStorage.getItem(ACTIVE_WORKSPACE_KEY)
      const nextId = list.find((workspace) => workspace.id === storedId)?.id ?? list[0]?.id ?? null

      setActiveIdState(nextId)

      if (nextId) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextId)
      } else {
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load workspaces')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      const t = setTimeout(() => {
        setWorkspaces([])
        setActiveIdState(null)
      }, 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      void refresh()
    }, 0)
    return () => clearTimeout(t)
  }, [enabled, refresh])

  function setActiveId(id: string): void {
    setActiveIdState(id)
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
  }

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId) ?? null

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, activeId, activeWorkspace, loading, error, refresh, setActiveId }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
