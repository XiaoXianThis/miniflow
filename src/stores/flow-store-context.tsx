import { createContext, useContext } from 'react'

import type { FlowPersistedState } from './flow-store'

const FlowStoreContext = createContext<FlowPersistedState | null>(null)

export function FlowStoreProvider({
  store,
  children,
}: {
  store: FlowPersistedState
  children: React.ReactNode
}) {
  return (
    <FlowStoreContext.Provider value={store}>{children}</FlowStoreContext.Provider>
  )
}

export function useFlowStore() {
  const store = useContext(FlowStoreContext)
  if (!store) {
    throw new Error('useFlowStore must be used within FlowStoreProvider')
  }
  return store
}
