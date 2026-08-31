import { describe, expect, test } from 'bun:test'

import {
  GPT_IMAGE_SIZE_PRESETS,
  formatAspectRatio,
  formatGptImageDimensionsLabel,
  formatGptImageSizeLabel,
  formatResolutionTier,
  parseGptImageSize,
} from '#/components/flow/gpt-image-options'

describe('gpt image size labels', () => {
  test('parses WxH strings', () => {
    expect(parseGptImageSize('1536x1024')).toEqual({ width: 1536, height: 1024 })
    expect(parseGptImageSize(' invalid ')).toBeNull()
  })

  test('formats common aspect ratios', () => {
    expect(formatAspectRatio(1536, 1152)).toBe('4:3')
    expect(formatAspectRatio(1536, 1024)).toBe('3:2')
    expect(formatAspectRatio(2048, 1152)).toBe('16:9')
    expect(formatAspectRatio(1024, 1024)).toBe('1:1')
  })

  test('formats resolution tiers', () => {
    expect(formatResolutionTier(2048, 1152)).toBe('2K')
    expect(formatResolutionTier(3840, 2160)).toBe('4K')
    expect(formatResolutionTier(1536, 1024)).toBeNull()
  })

  test('formats dimension labels with aspect ratio and tier', () => {
    expect(formatGptImageDimensionsLabel(1024, 1024)).toBe('1:1')
    expect(formatGptImageDimensionsLabel(1536, 1152)).toBe('4:3')
    expect(formatGptImageDimensionsLabel(1536, 1024)).toBe('3:2 横版')
    expect(formatGptImageDimensionsLabel(1024, 1536)).toBe('2:3 竖版')
    expect(formatGptImageDimensionsLabel(2048, 1536)).toBe('4:3 2K')
    expect(formatGptImageDimensionsLabel(2048, 1152)).toBe('16:9 2K')
    expect(formatGptImageDimensionsLabel(2048, 2048)).toBe('1:1 2K')
    expect(formatGptImageDimensionsLabel(3840, 2880)).toBe('4:3 4K')
    expect(formatGptImageDimensionsLabel(3840, 2160)).toBe('16:9 4K')
  })

  test('formats preset labels for dropdown', () => {
    expect(formatGptImageSizeLabel('auto')).toBe('自动')
    expect(formatGptImageSizeLabel('1536x1152')).toBe('4:3')
    expect(formatGptImageSizeLabel('1536x1024')).toBe('3:2 横版')
    expect(formatGptImageSizeLabel('custom', '3840x2160')).toBe('16:9 4K')
    expect(GPT_IMAGE_SIZE_PRESETS.find((item) => item.value === '2048x1536')?.label).toBe(
      '4:3 2K',
    )
    expect(GPT_IMAGE_SIZE_PRESETS.find((item) => item.value === '2048x1152')?.label).toBe(
      '16:9 2K',
    )
  })
})
