import { createServerFn } from '@tanstack/react-start'

import {
  buildGptImageRequest,
  toApiRequestBody,
  type GptImageRequest,
} from '#/components/flow/gpt-image-options'
import { requireAuth } from '#/server/auth'

type ImageGenerationResponse = {
  data?: Array<{
    b64_json?: string
    url?: string
    output_format?: string
  }>
  error?: { message?: string }
}

function getConfig() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('未配置 OPENAI_API_KEY')
  }

  const baseURL = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )

  return { apiKey, baseURL }
}

async function fetchImageAsBase64(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  return {
    base64: buffer.toString('base64'),
    mimeType: response.headers.get('content-type') ?? 'image/png',
  }
}

export const runGptImageFn = createServerFn({ method: 'POST' })
  .validator((data: GptImageRequest) => data)
  .handler(async ({ data }) => {
    await requireAuth()

    const { apiKey, baseURL } = getConfig()
    const request = buildGptImageRequest(data)
    const body = toApiRequestBody(request)

    const response = await fetch(`${baseURL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })

    const json = (await response.json()) as ImageGenerationResponse

    if (!response.ok) {
      throw new Error(json.error?.message ?? `生图失败 (${response.status})`)
    }

    const item = json.data?.[0]
    if (!item) {
      throw new Error('上游未返回图片数据')
    }

    if (item.b64_json) {
      const format = item.output_format ?? request.outputFormat
      return {
        mimeType: `image/${format}`,
        base64: item.b64_json,
      }
    }

    if (item.url) {
      return fetchImageAsBase64(item.url)
    }

    throw new Error('上游返回格式不支持')
  })
