import { describe, expect, test } from 'bun:test'

import { parsePersistedGraph, toPersistedGraph } from '#/stores/flow-persist-serializer'

describe('flow persist serializer', () => {
  test('strips image payloads but keeps refs', () => {
    const persisted = toPersistedGraph({
      nodes: [
        {
          id: 'img-1',
          type: 'imageView',
          position: { x: 0, y: 0 },
          data: {
            image: 'base64-bytes',
            mimeType: 'image/png',
            imageRef: 'img-1',
          },
        },
      ],
      edges: [],
    })

    expect(persisted.nodes[0]?.data).toEqual({
      imageRef: 'img-1',
      mimeType: 'image/png',
      image: null,
    })
  })

  test('parsePersistedGraph rejects invalid payloads', () => {
    expect(parsePersistedGraph('{"nodes":[],"edges":[]}')).toEqual({
      nodes: [],
      edges: [],
    })
    expect(parsePersistedGraph('{"nodes":[]}')).toBeNull()
    expect(parsePersistedGraph('nope')).toBeNull()
  })
})
