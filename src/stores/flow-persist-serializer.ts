import type { Snapshot } from 'valtio'
import type { Edge, Node } from '@xyflow/react'
import type { SerializationStrategy } from 'valtio-persist'

import type { ImageViewNodeData } from '#/components/flow/types'

type PersistedFlowState = {
  nodes: Node[]
  edges: Edge[]
}

function stripImagesForPersist(state: PersistedFlowState): PersistedFlowState {
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

export class FlowSerializationStrategy
  implements SerializationStrategy<PersistedFlowState, false>
{
  readonly isAsync = false as const

  serialize(state: Snapshot<PersistedFlowState>): string {
    const stripped = stripImagesForPersist(state as PersistedFlowState)
    return JSON.stringify(stripped)
  }

  deserialize(data: string): PersistedFlowState {
    return JSON.parse(data) as PersistedFlowState
  }
}
