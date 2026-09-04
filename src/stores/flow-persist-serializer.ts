import type { Edge, Node } from '@xyflow/react'

import type { ImageViewNodeData } from '#/components/flow/types'

export type PersistedFlowGraph = {
  nodes: Node[]
  edges: Edge[]
}

export function toPersistedGraph(state: PersistedFlowGraph): PersistedFlowGraph {
  return {
    nodes: state.nodes.map((node) => {
      if (node.type !== 'imageView') return node

      const data = node.data as ImageViewNodeData
      const hasImage = Boolean(data.image && data.mimeType)

      return {
        ...node,
        data: {
          imageRef: hasImage ? (data.imageRef ?? node.id) : data.imageRef ?? null,
          mimeType: data.mimeType,
          image: null,
        },
      }
    }),
    edges: state.edges,
  }
}

export function parsePersistedGraph(data: string): PersistedFlowGraph | null {
  try {
    const parsed = JSON.parse(data) as Partial<PersistedFlowGraph>
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return null
    }
    return { nodes: parsed.nodes, edges: parsed.edges }
  } catch {
    return null
  }
}
