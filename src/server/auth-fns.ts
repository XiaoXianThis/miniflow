import { createServerFn } from '@tanstack/react-start'

import {
  AuthError,
  getCurrentUser,
  loginWithCredentials,
  logoutCurrentSession,
} from '#/server/auth'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getCurrentUser()
  return { user }
})

export const loginFn = createServerFn({ method: 'POST' })
  .validator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const user = await loginWithCredentials(data.username, data.password)
      return { user }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('登录失败', 'INVALID_CREDENTIALS')
    }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  await logoutCurrentSession()
  return { ok: true as const }
})
