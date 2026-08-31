import type { Edge, Node } from '@xyflow/react'

import type { ImageViewNodeData, PptImageFit, PptLayout } from './types'

export type { PptImageFit, PptLayout }

export type ExportPptImage = {
  base64: string
  mimeType: string
}

export type ExportPptImageEntry = {
  nodeId: string
  image: ExportPptImage | null
}

export type ExportPptOptions = {
  layout: PptLayout
  imageFit: PptImageFit
}

export type ImagePlacement = {
  x: number
  y: number
  w: number
  h: number
}

export type SlideLayoutSize = {
  width: number
  height: number
  layoutName: string
}

const SLIDE_LAYOUTS: Record<Exclude<PptLayout, 'followImage'>, SlideLayoutSize> = {
  '16x9': { width: 10, height: 5.625, layoutName: 'LAYOUT_16x9' },
  '4x3': { width: 10, height: 7.5, layoutName: 'LAYOUT_4x3' },
}

const PX_PER_INCH = 96
const MAX_SLIDE_INCH = 13.33

export function getImageDimensionsFromBase64(
  base64: string,
  mimeType: string,
): { width: number; height: number } | null {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  if (mimeType.includes('png') && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const width = view.getUint32(16, false)
    const height = view.getUint32(20, false)
    if (width > 0 && height > 0) return { width, height }
  }

  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    let index = 2
    while (index < bytes.length - 8) {
      if (bytes[index] !== 0xff) {
        index += 1
        continue
      }

      const marker = bytes[index + 1]
      if (marker === 0xc0 || marker === 0xc2) {
        const height = (bytes[index + 5]! << 8) | bytes[index + 6]!
        const width = (bytes[index + 7]! << 8) | bytes[index + 8]!
        if (width > 0 && height > 0) return { width, height }
      }

      const segmentLength = (bytes[index + 2]! << 8) | bytes[index + 3]!
      index += 2 + segmentLength
    }
  }

  return null
}

export function imageToSlideInches(
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  let width = imageWidth / PX_PER_INCH
  let height = imageHeight / PX_PER_INCH
  const scale = Math.min(1, MAX_SLIDE_INCH / Math.max(width, height))
  return {
    width: width * scale,
    height: height * scale,
  }
}

export function resolveSlideLayout(
  layout: PptLayout,
  dimensions: Array<{ width: number; height: number } | null>,
): SlideLayoutSize {
  if (layout === 'followImage') {
    const firstDimension = dimensions.find((dimension) => dimension !== null)
    if (firstDimension) {
      const slide = imageToSlideInches(firstDimension.width, firstDimension.height)
      return {
        ...slide,
        layoutName: 'LAYOUT_FOLLOW_IMAGE',
      }
    }

    return SLIDE_LAYOUTS['16x9']
  }

  return SLIDE_LAYOUTS[layout]
}

export function computeImagePlacement(
  imageFit: PptImageFit,
  slideWidth: number,
  slideHeight: number,
  imageWidth: number,
  imageHeight: number,
): ImagePlacement {
  if (imageFit === 'cover') {
    const slideAspect = slideWidth / slideHeight
    const imageAspect = imageWidth / imageHeight

    if (imageAspect > slideAspect) {
      const height = slideHeight
      const width = height * imageAspect
      return {
        x: (slideWidth - width) / 2,
        y: 0,
        w: width,
        h: height,
      }
    }

    const width = slideWidth
    const height = width / imageAspect
    return {
      x: 0,
      y: (slideHeight - height) / 2,
      w: width,
      h: height,
    }
  }

  if (imageFit === 'stretch') {
    return {
      x: 0,
      y: 0,
      w: slideWidth,
      h: slideHeight,
    }
  }

  const aspect = imageWidth / imageHeight

  if (imageFit === 'fillWidth') {
    const width = slideWidth
    const height = width / aspect
    return {
      x: 0,
      y: (slideHeight - height) / 2,
      w: width,
      h: height,
    }
  }

  const height = slideHeight
  const width = height * aspect
  return {
    x: (slideWidth - width) / 2,
    y: 0,
    w: width,
    h: height,
  }
}

export function collectExportPptImages(
  nodes: Node[],
  edges: Edge[],
  exportNodeId: string,
): ExportPptImageEntry[] {
  const incoming = edges.filter((edge) => edge.target === exportNodeId)

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

  return entries.map(({ nodeId, image }) => ({ nodeId, image }))
}

export function countReadyExportImages(
  entries: ExportPptImageEntry[],
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

export async function resolveExportPptImages(
  nodes: Node[],
  edges: Edge[],
  exportNodeId: string,
  getImage: (key: string) => Promise<ExportPptImage | null>,
): Promise<ExportPptImage[]> {
  const collected = collectExportPptImages(nodes, edges, exportNodeId)
  const resolved: ExportPptImage[] = []

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

  return resolved
}

export async function buildPptxBlob(
  images: ExportPptImage[],
  options: ExportPptOptions = { layout: '16x9', imageFit: 'cover' },
): Promise<Blob> {
  const { default: pptxgen } = await import('pptxgenjs')
  const pptx = new pptxgen()

  const dimensions = images.map((image) =>
    getImageDimensionsFromBase64(image.base64, image.mimeType),
  )
  const slideLayout = resolveSlideLayout(options.layout, dimensions)

  if (options.layout === 'followImage') {
    pptx.defineLayout({
      name: slideLayout.layoutName,
      width: slideLayout.width,
      height: slideLayout.height,
    })
    pptx.layout = slideLayout.layoutName
  } else {
    pptx.layout = slideLayout.layoutName
  }

  for (const image of images) {
    const slide = pptx.addSlide()
    const dimension = getImageDimensionsFromBase64(image.base64, image.mimeType)
    const placement = dimension
      ? computeImagePlacement(
          options.imageFit,
          slideLayout.width,
          slideLayout.height,
          dimension.width,
          dimension.height,
        )
      : {
          x: 0,
          y: 0,
          w: slideLayout.width,
          h: slideLayout.height,
        }

    slide.addImage({
      data: `data:${image.mimeType};base64,${image.base64}`,
      x: placement.x,
      y: placement.y,
      w: placement.w,
      h: placement.h,
    })
  }

  const output = await pptx.write({ outputType: 'blob' })
  return output as Blob
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
