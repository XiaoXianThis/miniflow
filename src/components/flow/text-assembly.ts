import type { Edge, Node } from '@xyflow/react'

import type { TextInputNodeData } from './types'

export function getUpstreamTextInputIds(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
) {
  return edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source)
    .filter((sourceId) => nodes.find((node) => node.id === sourceId)?.type === 'textInput')
    .sort((a, b) => {
      const nodeA = nodes.find((node) => node.id === a)!
      const nodeB = nodes.find((node) => node.id === b)!
      return nodeA.position.x - nodeB.position.x
    })
}

export function hasUpstreamTextInputs(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
) {
  return getUpstreamTextInputIds(nodeId, nodes, edges).length > 0
}

export function assembleTextFromNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  visiting = new Set<string>(),
): string {
  if (visiting.has(nodeId)) return ''
  visiting.add(nodeId)

  const node = nodes.find((item) => item.id === nodeId)
  if (!node || node.type !== 'textInput') return ''

  const parts: string[] = []

  for (const upstreamId of getUpstreamTextInputIds(nodeId, nodes, edges)) {
    const upstreamText = assembleTextFromNode(upstreamId, nodes, edges, visiting)
    if (upstreamText) parts.push(upstreamText)
  }

  const ownText = (node.data as TextInputNodeData).text.trim()
  if (ownText) parts.push(ownText)

  return parts.join('\n\n')
}

export function wouldCreateTextInputCycle(
  sourceId: string,
  targetId: string,
  nodes: Node[],
  edges: Edge[],
) {
  if (sourceId === targetId) return true

  const visited = new Set<string>()
  const stack = [targetId]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === sourceId) return true
    if (visited.has(current)) continue
    visited.add(current)

    for (const edge of edges) {
      if (edge.target !== current) continue
      const source = nodes.find((node) => node.id === edge.source)
      if (source?.type === 'textInput') {
        stack.push(edge.source)
      }
    }
  }

  return false
}
