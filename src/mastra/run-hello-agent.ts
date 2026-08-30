import { createServerFn } from '@tanstack/react-start'

import { requireAuth } from '#/server/auth'
import { runHelloAgent } from './hello-agent'

export const runHelloAgentFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth()

    const message = await runHelloAgent(data.name)
    return { message }
  })
