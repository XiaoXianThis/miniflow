export type GptImageQuality = 'auto' | 'low' | 'medium' | 'high'
export type GptImageFormat = 'png' | 'jpeg' | 'webp'
export type GptImageBackground = 'auto' | 'opaque' | 'transparent'
export type GptImageModeration = 'auto' | 'low'

export type GptImageSizePreset =
  | 'auto'
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | '2048x1152'
  | '2048x2048'
  | '3840x2160'
  | 'custom'

export const GPT_IMAGE_SIZE_PRESETS: {
  value: GptImageSizePreset
  label: string
}[] = [
  { value: 'auto', label: '自动' },
  { value: '1024x1024', label: '1024×1024 方形' },
  { value: '1536x1024', label: '1536×1024 横版' },
  { value: '1024x1536', label: '1024×1536 竖版' },
  { value: '2048x1152', label: '2048×1152 2K 横' },
  { value: '2048x2048', label: '2048×2048 2K 方' },
  { value: '3840x2160', label: '3840×2160 4K 横' },
  { value: 'custom', label: '自定义' },
]

export const GPT_IMAGE_DEFAULTS = {
  model: 'gpt-image-2',
  size: '1536x1024' as GptImageSizePreset,
  customSize: '1536x1024',
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
