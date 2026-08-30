import { createFileRoute } from '@tanstack/react-router'

import { AuthProvider } from '#/components/auth/AuthProvider'
import { HelloFlow } from '#/components/flow/HelloFlow'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <AuthProvider>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <HelloFlow />
      </div>
    </AuthProvider>
  )
}
