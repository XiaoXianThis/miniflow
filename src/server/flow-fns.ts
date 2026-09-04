import { createServerFn } from '@tanstack/react-start'

import { requireAuth } from '#/server/auth'
import {
  createFlowForUser,
  deleteFlowForUser,
  FlowError,
  getFlowForUser,
  listFlowsForUser,
  renameFlowForUser,
  saveFlowForUser,
} from '#/server/flows'

export const listFlowsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireAuth()
  return listFlowsForUser(user.id)
})

export const getFlowFn = createServerFn({ method: 'POST' })
  .validator((data: { flowId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth()
      return await getFlowForUser(user.id, data.flowId)
    } catch (error) {
      if (error instanceof FlowError) throw error
      throw error
    }
  })

export const createFlowFn = createServerFn({ method: 'POST' })
  .validator((data?: { name?: string; nodes?: unknown[]; edges?: unknown[] }) => data ?? {})
  .handler(async ({ data }) => {
    const user = await requireAuth()
    return createFlowForUser(user.id, data)
  })

export const saveFlowFn = createServerFn({ method: 'POST' })
  .validator(
    (data: { flowId: string; name?: string; nodes: unknown[]; edges: unknown[] }) =>
      data,
  )
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth()
      return await saveFlowForUser(user.id, data)
    } catch (error) {
      if (error instanceof FlowError) throw error
      throw error
    }
  })

export const renameFlowFn = createServerFn({ method: 'POST' })
  .validator((data: { flowId: string; name: string }) => data)
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth()
      return await renameFlowForUser(user.id, data.flowId, data.name)
    } catch (error) {
      if (error instanceof FlowError) throw error
      throw error
    }
  })

export const deleteFlowFn = createServerFn({ method: 'POST' })
  .validator((data: { flowId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth()
      return await deleteFlowForUser(user.id, data.flowId)
    } catch (error) {
      if (error instanceof FlowError) throw error
      throw error
    }
  })
