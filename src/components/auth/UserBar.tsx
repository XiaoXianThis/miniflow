import { Link } from '@tanstack/react-router'

import { useAuth } from '#/components/auth/AuthProvider'

export function UserBar({ leading }: { leading?: React.ReactNode }) {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {leading ?? (
          <Link to="/" className="text-sm font-semibold text-slate-900">
            MiniFlow
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-sm text-slate-600">
          已登录：<span className="font-medium text-slate-900">{user.username}</span>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          退出登录
        </button>
      </div>
    </div>
  )
}
