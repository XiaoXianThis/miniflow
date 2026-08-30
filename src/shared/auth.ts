export function isAuthFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('未登录') ||
    message.includes('会话无效') ||
    message.includes('会话无效或已过期')
  )
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return '操作失败'
}
