import {
  GPT_IMAGE_DEFAULTS,
  type GptImageBackground,
  type GptImageFormat,
  type GptImageModeration,
  type GptImageQuality,
  type GptImageSizePreset,
} from './gpt-image-options'

export type FlowNodeType =
  | 'textInput'
  | 'helloAgent'
  | 'resultView'
  | 'gptImage'
  | 'imageView'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

export type TextInputNodeData = {
  text: string
}

export type HelloAgentNodeData = {
  status: AgentStatus
}

export type OutputNodeData = {
  result: string | null
}

export type GptImageNodeData = {
  status: AgentStatus
  model: string
  size: GptImageSizePreset
  customSize: string
  quality: GptImageQuality
  n: number
  outputFormat: GptImageFormat
  outputCompression: number
  background: GptImageBackground
  moderation: GptImageModeration
  showAdvanced: boolean
}

export type ImageViewNodeData = {
  image: string | null
  mimeType: string | null
  imageRef: string | null
}

export const NODE_DEFAULT_SIZES: Record<
  FlowNodeType,
  { width: number; height: number; minWidth: number; minHeight: number }
> = {
  textInput: { width: 256, height: 180, minWidth: 200, minHeight: 120 },
  helloAgent: { width: 240, height: 160, minWidth: 200, minHeight: 120 },
  resultView: { width: 240, height: 140, minWidth: 180, minHeight: 100 },
  gptImage: { width: 320, height: 380, minWidth: 260, minHeight: 200 },
  imageView: { width: 280, height: 280, minWidth: 200, minHeight: 160 },
}

export function getDefaultNodeData(type: FlowNodeType) {
  switch (type) {
    case 'textInput':
      return { text: '' } satisfies TextInputNodeData
    case 'helloAgent':
      return { status: 'idle' } satisfies HelloAgentNodeData
    case 'resultView':
      return { result: null } satisfies OutputNodeData
    case 'gptImage':
      return {
        status: 'idle',
        ...GPT_IMAGE_DEFAULTS,
      } satisfies GptImageNodeData
    case 'imageView':
      return { image: null, mimeType: null, imageRef: null } satisfies ImageViewNodeData
  }
}
