import { createFlowFn } from '#/server/flow-fns'
import { DEFAULT_FLOW_NAME, LEGACY_FLOW_STORAGE_KEY } from '#/shared/flows'

import { parsePersistedGraph } from './flow-persist-serializer'

function migratedKey(userId: string) {
  return `miniflow-flow-migrated:${userId}`
}

export async function importLegacyLocalFlowIfNeeded(
  userId: string,
  existingCount: number,
) {
  if (typeof window === 'undefined') return false
  if (localStorage.getItem(migratedKey(userId))) return false

  const raw = localStorage.getItem(LEGACY_FLOW_STORAGE_KEY)
  if (existingCount > 0 || !raw) {
    localStorage.setItem(migratedKey(userId), '1')
    if (existingCount > 0 && raw) {
      localStorage.removeItem(LEGACY_FLOW_STORAGE_KEY)
    }
    return false
  }

  const graph = parsePersistedGraph(raw)
  if (!graph || (graph.nodes.length === 0 && graph.edges.length === 0)) {
    localStorage.setItem(migratedKey(userId), '1')
    localStorage.removeItem(LEGACY_FLOW_STORAGE_KEY)
    return false
  }

  await createFlowFn({
    data: {
      name: DEFAULT_FLOW_NAME,
      nodes: graph.nodes,
      edges: graph.edges,
    },
  })

  localStorage.setItem(migratedKey(userId), '1')
  localStorage.removeItem(LEGACY_FLOW_STORAGE_KEY)
  return true
}
