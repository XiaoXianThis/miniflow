import { describe, expect, test } from 'bun:test'
import type { Edge, Node } from '@xyflow/react'

import {
  collectGptImageReferenceEntries,
  countReadyGptImageReferences,
  resolveGptImageReferences,
} from '#/components/flow/gpt-image-references'
import { GPT_IMAGE_MAX_REFERENCE_IMAGES } from '#/components/flow/gpt-image-options'

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function imageViewNode(
  id: string,
  position: { x: number; y: number },
  data: {
    image?: string | null
    mimeType?: string | null
    imageRef?: string | null
  } = {},
): Node {
  return {
    id,
    type: 'imageView',
    position,
    data: {
      image: data.image ?? null,
      mimeType: data.mimeType ?? null,
      imageRef: data.imageRef ?? null,
    },
  }
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target }
}

describe('collectGptImageReferenceEntries', () => {
  test('returns connected imageView nodes sorted top-to-bottom then left-to-right', () => {
    const nodes: Node[] = [
      imageViewNode('img-bottom', { x: 0, y: 200 }, {
        image: TINY_PNG_BASE64,
        mimeType: 'image/png',
      }),
      imageViewNode('img-top', { x: 100, y: 0 }, {
        image: TINY_PNG_BASE64,
        mimeType: 'image/png',
      }),
      { id: 'gpt-1', type: 'gptImage', position: { x: 300, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      edge('e1', 'img-bottom', 'gpt-1'),
      edge('e2', 'img-top', 'gpt-1'),
    ]

    const entries = collectGptImageReferenceEntries(nodes, edges, 'gpt-1')
    expect(entries.map((entry) => entry.nodeId)).toEqual(['img-top', 'img-bottom'])
  })

  test('ignores non-imageView sources', () => {
    const nodes: Node[] = [
      { id: 'text-1', type: 'textInput', position: { x: 0, y: 0 }, data: { text: '' } },
      imageViewNode('img-1', { x: 0, y: 100 }, {
        image: TINY_PNG_BASE64,
        mimeType: 'image/png',
      }),
      { id: 'gpt-1', type: 'gptImage', position: { x: 300, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      edge('e1', 'text-1', 'gpt-1'),
      edge('e2', 'img-1', 'gpt-1'),
    ]

    const entries = collectGptImageReferenceEntries(nodes, edges, 'gpt-1')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.nodeId).toBe('img-1')
  })
})

describe('resolveGptImageReferences', () => {
  test('limits resolved references to GPT_IMAGE_MAX_REFERENCE_IMAGES', async () => {
    const nodes: Node[] = Array.from({ length: 10 }, (_, index) =>
      imageViewNode(`img-${index}`, { x: 0, y: index * 10 }, {
        image: TINY_PNG_BASE64,
        mimeType: 'image/png',
      }),
    )
    nodes.push({
      id: 'gpt-1',
      type: 'gptImage',
      position: { x: 300, y: 0 },
      data: {},
    })

    const edges: Edge[] = nodes
      .filter((node) => node.type === 'imageView')
      .map((node, index) => edge(`e${index}`, node.id, 'gpt-1'))

    const resolved = await resolveGptImageReferences(
      nodes,
      edges,
      'gpt-1',
      async () => null,
    )

    expect(resolved).toHaveLength(GPT_IMAGE_MAX_REFERENCE_IMAGES)
  })

  test('loads images from storage when inline data is missing', async () => {
    const nodes: Node[] = [
      imageViewNode('stored', { x: 0, y: 0 }, { imageRef: 'stored' }),
      { id: 'gpt-1', type: 'gptImage', position: { x: 300, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [edge('e1', 'stored', 'gpt-1')]

    const resolved = await resolveGptImageReferences(
      nodes,
      edges,
      'gpt-1',
      async (key) =>
        key === 'stored'
          ? { base64: TINY_PNG_BASE64, mimeType: 'image/png' }
          : null,
    )

    expect(resolved).toEqual([
      { base64: TINY_PNG_BASE64, mimeType: 'image/png' },
    ])
  })
})

describe('countReadyGptImageReferences', () => {
  test('counts inline images and image refs', () => {
    const nodes: Node[] = [
      imageViewNode('inline', { x: 0, y: 0 }, {
        image: TINY_PNG_BASE64,
        mimeType: 'image/png',
      }),
      imageViewNode('stored', { x: 0, y: 100 }, {
        image: null,
        mimeType: 'image/png',
        imageRef: 'stored',
      }),
      imageViewNode('empty', { x: 0, y: 200 }),
    ]
    const entries = collectGptImageReferenceEntries(
      [...nodes, { id: 'gpt-1', type: 'gptImage', position: { x: 300, y: 0 }, data: {} }],
      [
        edge('e1', 'inline', 'gpt-1'),
        edge('e2', 'stored', 'gpt-1'),
        edge('e3', 'empty', 'gpt-1'),
      ],
      'gpt-1',
    )

    expect(countReadyGptImageReferences(entries, nodes)).toBe(2)
  })
})
