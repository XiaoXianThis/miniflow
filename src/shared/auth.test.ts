import { describe, expect, test } from 'bun:test'

import { isAuthFailure } from '#/shared/auth'

describe('shared auth helpers', () => {
  test('detects auth failures from error messages', () => {
    expect(isAuthFailure(new Error('未登录'))).toBe(true)
    expect(isAuthFailure(new Error('会话无效或已过期'))).toBe(true)
    expect(isAuthFailure(new Error('生图失败'))).toBe(false)
  })
})
