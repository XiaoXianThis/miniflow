import { describe, expect, test } from 'bun:test'

import { extractImageNodeIds, parseFlowGraph } from '#/shared/flows'

describe('shared flow helpers', () => {
  test('parseFlowGraph reads nodes and edges', () => {
    expect(parseFlowGraph('{"nodes":[{"id":"a"}],"edges":[]}')).toEqual({
      nodes: [{ id: 'a' }],
      edges: [],
    })
    expect(parseFlowGraph('not-json')).toEqual({ nodes: [], edges: [] })
  })

  test('extractImageNodeIds returns image view ids', () => {
    expect(
      extractImageNodeIds({
        nodes: [
          { id: 'img-1', type: 'imageView' },
          { id: 'text-1', type: 'textInput' },
        ],
        edges: [],
      }),
    ).toEqual(['img-1'])
  })
})
