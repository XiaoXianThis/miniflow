import { createFileRoute } from '@tanstack/react-router'

import { useAuth } from '#/components/auth/AuthProvider'
import { HelloFlow } from '#/components/flow/HelloFlow'

export const Route = createFileRoute('/flows/$flowId')({
  component: FlowEditorPage,
})

function FlowEditorPage() {
  const { flowId } = Route.useParams()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        {isLoading ? '正在验证登录…' : '请先登录'}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <HelloFlow flowId={flowId} />
    </div>
  )
}

