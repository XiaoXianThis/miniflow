import { describe, expect, test } from 'bun:test'
import type { Edge, Node } from '@xyflow/react'

import {
  buildPptxBlob,
  collectExportPptImages,
  computeImagePlacement,
  countReadyExportImages,
  getImageDimensionsFromBase64,
  imageToSlideInches,
  resolveExportPptImages,
  resolveSlideLayout,
} from '#/components/flow/export-ppt'
import { isValidFlowConnection } from '#/stores/flow-store'

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const WIDE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

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

describe('getImageDimensionsFromBase64', () => {
  test('reads png dimensions', () => {
    expect(getImageDimensionsFromBase64(TINY_PNG_BASE64, 'image/png')).toEqual({
      width: 1,
      height: 1,
    })
    expect(getImageDimensionsFromBase64(WIDE_PNG_BASE64, 'image/png')).toEqual({
      width: 2,
      height: 2,
    })
  })
})

describe('computeImagePlacement', () => {
  test('covers slide while preserving aspect ratio', () => {
    const placement = computeImagePlacement('cover', 10, 5, 16, 9)
    expect(placement.x).toBe(0)
    expect(placement.w).toBe(10)
    expect(placement.h).toBeCloseTo(5.625)
    expect(placement.y).toBeCloseTo(-0.3125)
  })

  test('covers wide slide with portrait image', () => {
    const placement = computeImagePlacement('cover', 10, 5, 9, 16)
    expect(placement.x).toBe(0)
    expect(placement.w).toBe(10)
    expect(placement.h).toBeCloseTo(17.77777777777778)
    expect(placement.y).toBeCloseTo(-6.388888888888889)
  })

  test('stretches image to fill slide', () => {
    expect(computeImagePlacement('stretch', 10, 5, 16, 9)).toEqual({
      x: 0,
      y: 0,
      w: 10,
      h: 5,
    })
  })

  test('fills slide width and centers vertically', () => {
    const placement = computeImagePlacement('fillWidth', 10, 5, 16, 9)
    expect(placement.x).toBe(0)
    expect(placement.w).toBe(10)
    expect(placement.h).toBeCloseTo(5.625)
    expect(placement.y).toBeCloseTo(-0.3125)
  })

  test('fills slide height and centers horizontally', () => {
    const placement = computeImagePlacement('fillHeight', 10, 5, 16, 9)
    expect(placement.y).toBe(0)
    expect(placement.h).toBe(5)
    expect(placement.w).toBeCloseTo(8.88888888888889)
    expect(placement.x).toBeCloseTo(0.5555555555555556)
  })
})

describe('resolveSlideLayout', () => {
  test('returns fixed layouts', () => {
    expect(resolveSlideLayout('16x9', [])).toEqual({
      width: 10,
      height: 5.625,
      layoutName: 'LAYOUT_16x9',
    })
    expect(resolveSlideLayout('4x3', [])).toEqual({
      width: 10,
      height: 7.5,
      layoutName: 'LAYOUT_4x3',
    })
  })

  test('follows first image dimensions', () => {
    const layout = resolveSlideLayout('followImage', [{ width: 1920, height: 1080 }])
    expect(layout.layoutName).toBe('LAYOUT_FOLLOW_IMAGE')
    expect(layout.width).toBeCloseTo(13.33)
    expect(layout.height).toBeCloseTo(7.498125)
  })

  test('scales large images down to max slide size', () => {
    const layout = imageToSlideInches(4000, 3000)
    expect(layout.width).toBeLessThanOrEqual(13.33)
    expect(layout.height).toBeLessThanOrEqual(13.33)
  })
})

describe('collectExportPptImages', () => {
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
      imageViewNode('img-middle', { x: 0, y: 100 }, {
        image: TINY_PNG_BASE64,
        mimeType: 'image/png',
      }),
      { id: 'export-1', type: 'exportPpt', position: { x: 400, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      edge('e1', 'img-bottom', 'export-1'),
      edge('e2', 'img-top', 'export-1'),
      edge('e3', 'img-middle', 'export-1'),
    ]

    const result = collectExportPptImages(nodes, edges, 'export-1')

    expect(result.map((entry) => entry.nodeId)).toEqual([
      'img-top',
      'img-middle',
      'img-bottom',
    ])
    expect(result.every((entry) => entry.image?.mimeType === 'image/png')).toBe(true)
  })

  test('ignores non-imageView sources and other export targets', () => {
    const nodes: Node[] = [
      imageViewNode('img-1', { x: 0, y: 0 }, {
        image: TINY_PNG_BASE64,
        mimeType: 'image/png',
      }),
      { id: 'text-1', type: 'textInput', position: { x: 0, y: 0 }, data: { text: '' } },
      { id: 'export-1', type: 'exportPpt', position: { x: 200, y: 0 }, data: {} },
      { id: 'export-2', type: 'exportPpt', position: { x: 400, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      edge('e1', 'img-1', 'export-1'),
      edge('e2', 'text-1', 'export-1'),
      edge('e3', 'img-1', 'export-2'),
    ]

    expect(collectExportPptImages(nodes, edges, 'export-1')).toHaveLength(1)
    expect(collectExportPptImages(nodes, edges, 'export-2')).toHaveLength(1)
  })
})

describe('countReadyExportImages', () => {
  test('counts inline images and nodes with imageRef', () => {
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
    const entries = collectExportPptImages(
      [...nodes, { id: 'export-1', type: 'exportPpt', position: { x: 0, y: 0 }, data: {} }],
      [
        edge('e1', 'inline', 'export-1'),
        edge('e2', 'stored', 'export-1'),
        edge('e3', 'empty', 'export-1'),
      ],
      'export-1',
    )

    expect(countReadyExportImages(entries, nodes)).toBe(2)
  })
})

describe('resolveExportPptImages', () => {
  test('loads missing inline data from image store callback', async () => {
    const nodes: Node[] = [
      imageViewNode('stored', { x: 0, y: 0 }, {
        image: null,
        mimeType: null,
        imageRef: 'stored-key',
      }),
      { id: 'export-1', type: 'exportPpt', position: { x: 200, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [edge('e1', 'stored', 'export-1')]

    const images = await resolveExportPptImages(
      nodes,
      edges,
      'export-1',
      async (key) => {
        if (key === 'stored-key') {
          return { base64: TINY_PNG_BASE64, mimeType: 'image/png' }
        }
        return null
      },
    )

    expect(images).toHaveLength(1)
    expect(images[0]?.base64).toBe(TINY_PNG_BASE64)
  })

  test('skips nodes without resolvable image data', async () => {
    const nodes: Node[] = [
      imageViewNode('empty', { x: 0, y: 0 }),
      { id: 'export-1', type: 'exportPpt', position: { x: 200, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [edge('e1', 'empty', 'export-1')]

    const images = await resolveExportPptImages(
      nodes,
      edges,
      'export-1',
      async () => null,
    )

    expect(images).toHaveLength(0)
  })
})

describe('buildPptxBlob', () => {
  test('creates a zip-based pptx blob for one or more images', async () => {
    const single = await buildPptxBlob(
      [{ base64: TINY_PNG_BASE64, mimeType: 'image/png' }],
      { layout: '16x9', imageFit: 'cover' },
    )
    const multiple = await buildPptxBlob(
      [
        { base64: TINY_PNG_BASE64, mimeType: 'image/png' },
        { base64: TINY_PNG_BASE64, mimeType: 'image/png' },
      ],
      { layout: '16x9', imageFit: 'cover' },
    )

    for (const blob of [single, multiple]) {
      expect(blob).toBeInstanceOf(Blob)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      expect(bytes[0]).toBe(0x50)
      expect(bytes[1]).toBe(0x4b)
    }

    expect(multiple.size).toBeGreaterThan(single.size)
  })

  test('supports 4:3 layout and fill height', async () => {
    const blob = await buildPptxBlob(
      [{ base64: TINY_PNG_BASE64, mimeType: 'image/png' }],
      { layout: '4x3', imageFit: 'fillHeight' },
    )
    expect(blob.size).toBeGreaterThan(0)
  })

  test('supports stretch fill', async () => {
    const blob = await buildPptxBlob(
      [{ base64: TINY_PNG_BASE64, mimeType: 'image/png' }],
      { layout: '16x9', imageFit: 'stretch' },
    )
    expect(blob.size).toBeGreaterThan(0)
  })

  test('supports follow image layout', async () => {
    const blob = await buildPptxBlob(
      [{ base64: WIDE_PNG_BASE64, mimeType: 'image/png' }],
      { layout: 'followImage', imageFit: 'cover' },
    )
    expect(blob.size).toBeGreaterThan(0)
  })
})

describe('isValidFlowConnection', () => {
  test('allows imageView to exportPpt', () => {
    const nodes: Node[] = [
      imageViewNode('img-1', { x: 0, y: 0 }),
      { id: 'export-1', type: 'exportPpt', position: { x: 200, y: 0 }, data: {} },
    ]

    expect(
      isValidFlowConnection(
        { source: 'img-1', target: 'export-1' },
        nodes,
      ),
    ).toBe(true)
  })

  test('rejects unsupported connections to exportPpt', () => {
    const nodes: Node[] = [
      { id: 'text-1', type: 'textInput', position: { x: 0, y: 0 }, data: { text: '' } },
      { id: 'export-1', type: 'exportPpt', position: { x: 200, y: 0 }, data: {} },
    ]

    expect(
      isValidFlowConnection(
        { source: 'text-1', target: 'export-1' },
        nodes,
      ),
    ).toBe(false)
  })
})
