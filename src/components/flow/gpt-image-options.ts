export type GptImageQuality = 'auto' | 'low' | 'medium' | 'high'
export type GptImageFormat = 'png' | 'jpeg' | 'webp'
export type GptImageBackground = 'auto' | 'opaque' | 'transparent'
export type GptImageModeration = 'auto' | 'low'

export type GptImageSizePreset =
  | 'auto'
  | '1024x1024'
  | '1536x1152'
  | '1536x1024'
  | '1024x1536'
  | '2048x1536'
  | '2048x1152'
  | '2048x2048'
  | '3840x2880'
  | '3840x2160'
  | 'custom'

const FIXED_SIZE_PRESETS: Exclude<GptImageSizePreset, 'auto' | 'custom'>[] = [
  '1024x1024',
  '1536x1152',
  '1536x1024',
  '1024x1536',
  '2048x1536',
  '2048x1152',
  '2048x2048',
  '3840x2880',
  '3840x2160',
]

const COMMON_ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
] as const

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const remainder = x % y
    x = y
    y = remainder
  }
  return x
}

export function parseGptImageSize(
  size: string,
): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/i.exec(size.trim())
  if (!match) return null

  const width = Number(match[1])
  const height = Number(match[2])
  if (width <= 0 || height <= 0) return null

  return { width, height }
}

export function formatAspectRatio(width: number, height: number): string {
  const ratio = width / height
  for (const item of COMMON_ASPECT_RATIOS) {
    if (Math.abs(ratio - item.value) < 0.02) {
      return item.label
    }
  }

  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

export function formatResolutionTier(
  width: number,
  height: number,
): string | null {
  const maxSide = Math.max(width, height)
  if (maxSide >= 3840) return '4K'
  if (maxSide >= 2048) return '2K'
  return null
}

export function formatGptImageDimensionsLabel(
  width: number,
  height: number,
): string {
  const aspect = formatAspectRatio(width, height)
  const tier = formatResolutionTier(width, height)
  const parts = [aspect]

  if (tier) {
    parts.push(tier)
  }

  const usesOrientationHint = !['1:1', '16:9', '9:16', '4:3', '3:4'].includes(aspect)
  if (usesOrientationHint) {
    if (width > height) parts.push('横版')
    if (width < height) parts.push('竖版')
  }

  return parts.join(' ')
}

export function formatGptImageSizeLabel(
  size: GptImageSizePreset | string,
  customSize?: string,
): string {
  if (size === 'auto') return '自动'
  if (size === 'custom') {
    const parsed = parseGptImageSize(customSize ?? '')
    return parsed
      ? formatGptImageDimensionsLabel(parsed.width, parsed.height)
      : '自定义'
  }

  const parsed = parseGptImageSize(size)
  return parsed ? formatGptImageDimensionsLabel(parsed.width, parsed.height) : String(size)
}

export const GPT_IMAGE_SIZE_PRESETS: {
  value: GptImageSizePreset
  label: string
}[] = [
  { value: 'auto', label: '自动' },
  ...FIXED_SIZE_PRESETS.map((value) => ({
    value,
    label: formatGptImageSizeLabel(value),
  })),
  { value: 'custom', label: '自定义' },
]

export const GPT_IMAGE_DEFAULTS = {
  model: 'gpt-image-2',
  size: '2048x1152' as GptImageSizePreset,
  customSize: '2048x1152',
  quality: 'low' as GptImageQuality,
  n: 1,
  outputFormat: 'png' as GptImageFormat,
  outputCompression: 80,
  background: 'auto' as GptImageBackground,
  moderation: 'auto' as GptImageModeration,
  showAdvanced: false,
}

export type GptImageRequest = {
  prompt: string
  model: string
  size: string
  quality: GptImageQuality
  n: number
  outputFormat: GptImageFormat
  outputCompression: number
  background: GptImageBackground
  moderation: GptImageModeration
}

export function resolveGptImageSize(
  size: GptImageSizePreset | string,
  customSize: string,
) {
  if (size === 'custom') return customSize.trim() || GPT_IMAGE_DEFAULTS.customSize
  return size
}

export function buildGptImageRequest(
  data: Partial<GptImageRequest> & { prompt: string },
): GptImageRequest {
  return {
    prompt: data.prompt,
    model: data.model ?? GPT_IMAGE_DEFAULTS.model,
    size: data.size ?? resolveGptImageSize(GPT_IMAGE_DEFAULTS.size, GPT_IMAGE_DEFAULTS.customSize),
    quality: data.quality ?? GPT_IMAGE_DEFAULTS.quality,
    n: data.n ?? GPT_IMAGE_DEFAULTS.n,
    outputFormat: data.outputFormat ?? GPT_IMAGE_DEFAULTS.outputFormat,
    outputCompression: data.outputCompression ?? GPT_IMAGE_DEFAULTS.outputCompression,
    background: data.background ?? GPT_IMAGE_DEFAULTS.background,
    moderation: data.moderation ?? GPT_IMAGE_DEFAULTS.moderation,
  }
}

export function toApiRequestBody(request: GptImageRequest) {
  let outputFormat = request.outputFormat
  let background = request.background

  if (background === 'transparent' && outputFormat === 'jpeg') {
    outputFormat = 'png'
  }

  const body: Record<string, unknown> = {
    model: request.model,
    prompt: request.prompt,
    size: request.size,
    quality: request.quality,
    n: request.n,
    output_format: outputFormat,
    background,
    moderation: request.moderation,
  }

  if (outputFormat === 'jpeg' || outputFormat === 'webp') {
    body.output_compression = request.outputCompression
  }

  return body
}
