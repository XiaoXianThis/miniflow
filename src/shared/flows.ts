export const DEFAULT_FLOW_NAME = '未命名流程'
export const LEGACY_FLOW_STORAGE_KEY = 'miniflow-flow'

export type FlowGraph = {
  nodes: unknown[]
  edges: unknown[]
}

export type FlowListItem = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  nodeCount: number
}

export type FlowDocumentPayload = {
  id: string
  name: string
  nodes: unknown[]
  edges: unknown[]
  createdAt: number
  updatedAt: number
}

export function parseFlowGraph(raw: string): FlowGraph {
  try {
    const parsed = JSON.parse(raw) as Partial<FlowGraph>
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    }
  } catch {
    return { nodes: [], edges: [] }
  }
}

export function extractImageNodeIds(graph: FlowGraph): string[] {
  const ids: string[] = []

  for (const node of graph.nodes) {
    if (!node || typeof node !== 'object') continue
    const candidate = node as { id?: unknown; type?: unknown }
    if (candidate.type === 'imageView' && typeof candidate.id === 'string') {
      ids.push(candidate.id)
    }
  }

  return ids
}
