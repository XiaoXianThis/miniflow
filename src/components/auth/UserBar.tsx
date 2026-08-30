import { useAuth } from '#/components/auth/AuthProvider'

export function UserBar() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
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
  )
}
