import { createFileRoute } from '@tanstack/react-router'

import { FlowDashboard } from '#/components/dashboard/FlowDashboard'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <FlowDashboard />
    </div>
  )
}
