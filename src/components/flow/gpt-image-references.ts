import type { Edge, Node } from '@xyflow/react'

import {
  GPT_IMAGE_MAX_REFERENCE_IMAGES,
  type GptImageReferenceImage,
} from './gpt-image-options'
import type { ImageViewNodeData } from './types'

export type GptImageReferenceEntry = {
  nodeId: string
  position: { x: number; y: number }
  image: GptImageReferenceImage | null
  hasImageRef: boolean
}

export function collectGptImageReferenceEntries(
  nodes: Node[],
  edges: Edge[],
  gptImageNodeId: string,
): GptImageReferenceEntry[] {
  const incoming = edges.filter((edge) => edge.target === gptImageNodeId)

  const entries = incoming
    .map((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source)
      if (!sourceNode || sourceNode.type !== 'imageView') return null

      const data = sourceNode.data as ImageViewNodeData
      const image =
        data.image && data.mimeType
          ? { base64: data.image, mimeType: data.mimeType }
          : null

      return {
        nodeId: sourceNode.id,
        position: sourceNode.position,
        image,
        hasImageRef: Boolean(data.imageRef),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  entries.sort((a, b) => {
    const dy = a.position.y - b.position.y
    if (dy !== 0) return dy
    return a.position.x - b.position.x
  })

  return entries
}

export function countReadyGptImageReferences(
  entries: GptImageReferenceEntry[],
  nodes: Node[],
): number {
  return entries.filter((entry) => {
    if (entry.image) return true
    const node = nodes.find((item) => item.id === entry.nodeId)
    if (!node || node.type !== 'imageView') return false
    const data = node.data as ImageViewNodeData
    return Boolean(data.imageRef)
  }).length
}

export async function resolveGptImageReferences(
  nodes: Node[],
  edges: Edge[],
  gptImageNodeId: string,
  getImage: (key: string) => Promise<GptImageReferenceImage | null>,
): Promise<GptImageReferenceImage[]> {
  const collected = collectGptImageReferenceEntries(nodes, edges, gptImageNodeId)
  const resolved: GptImageReferenceImage[] = []

  for (const entry of collected) {
    if (entry.image) {
      resolved.push(entry.image)
      continue
    }

    const node = nodes.find((item) => item.id === entry.nodeId)
    if (!node || node.type !== 'imageView') continue

    const data = node.data as ImageViewNodeData
    const ref = data.imageRef ?? node.id
    const stored = await getImage(ref)
    if (stored) {
      resolved.push(stored)
    }
  }

  return resolved.slice(0, GPT_IMAGE_MAX_REFERENCE_IMAGES)
}
