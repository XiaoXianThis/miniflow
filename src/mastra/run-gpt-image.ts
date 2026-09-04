import { createServerFn } from '@tanstack/react-start'

import {
  buildGptImageRequest,
  buildGptImageEditFormData,
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

const FETCH_RETRIES = 3
const FETCH_RETRY_DELAY_MS = 2_000

function isRetryableFetchError(error: unknown) {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('socket connection was closed') ||
    message.includes('econnreset') ||
    message.includes('connection reset') ||
    message.includes('fetch failed')
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(input: string, init?: RequestInit) {
  let lastError: unknown

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    try {
      return await fetch(input, init)
    } catch (error) {
      lastError = error
      if (attempt < FETCH_RETRIES && isRetryableFetchError(error)) {
        await sleep(FETCH_RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      break
    }
  }

  if (isRetryableFetchError(lastError)) {
    throw new Error('生图服务连接不稳定，请稍后重试')
  }

  throw lastError
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
  const response = await fetchWithRetry(url)
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
    const hasReferences = (request.referenceImages?.length ?? 0) > 0

    const response = await fetchWithRetry(
      `${baseURL}/${hasReferences ? 'images/edits' : 'images/generations'}`,
      hasReferences
        ? {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: buildGptImageEditFormData(request),
            signal: AbortSignal.timeout(120_000),
          }
        : {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(toApiRequestBody(request)),
            signal: AbortSignal.timeout(120_000),
          },
    )

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
