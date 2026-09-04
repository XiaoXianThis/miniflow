import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { UserBar } from '#/components/auth/UserBar'
import { useAuth } from '#/components/auth/AuthProvider'
import {
  createFlowFn,
  deleteFlowFn,
  listFlowsFn,
  renameFlowFn,
} from '#/server/flow-fns'
import { DEFAULT_FLOW_NAME, type FlowListItem } from '#/shared/flows'
import { importLegacyLocalFlowIfNeeded } from '#/stores/flow-legacy'
import { deleteFlowImage } from '#/stores/flow-image-store'
import { syncLoadedFlowName } from '#/stores/flow-store'

function formatUpdatedAt(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function FlowDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<FlowListItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsReady(false)
      return
    }

    let cancelled = false
    const userId = user.id

    async function load() {
      setError(null)
      try {
        const listed = await listFlowsFn()
        const imported = await importLegacyLocalFlowIfNeeded(userId, listed.length)
        const next = imported ? await listFlowsFn() : listed
        if (!cancelled) {
          setItems(next)
          setIsReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载流程列表失败')
          setIsReady(true)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user])

  const handleCreate = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const created = await createFlowFn({ data: { name: DEFAULT_FLOW_NAME } })
      await navigate({ to: '/flows/$flowId', params: { flowId: created.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建流程失败')
      setIsCreating(false)
    }
  }

  const handleDeleted = (flowId: string) => {
    setItems((current) => current.filter((item) => item.id !== flowId))
  }

  const handleRenamed = (flowId: string, name: string, updatedAt: number) => {
    setItems((current) =>
      current
        .map((item) => (item.id === flowId ? { ...item, name, updatedAt } : item))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-50">
      <UserBar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">我的流程</h1>
              <p className="mt-1 text-sm text-slate-500">选择一个流程打开画布，或创建新的流程。</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!isAuthenticated || isCreating}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? '创建中…' : '新建流程'}
            </button>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}

          {isLoading || (isAuthenticated && !isReady) ? (
            <p className="text-sm text-slate-500">加载流程列表…</p>
          ) : null}

          {isReady && items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="text-slate-800">还没有流程</p>
              <p className="mt-2 text-sm text-slate-500">
                创建第一个 flow，然后在画布里编排节点。
              </p>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={isCreating}
                className="mt-6 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? '创建中…' : '创建流程'}
              </button>
            </div>
          ) : null}

          {items.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <FlowCard
                    item={item}
                    onDeleted={handleDeleted}
                    onRenamed={handleRenamed}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function FlowCard({
  item,
  onDeleted,
  onRenamed,
}: {
  item: FlowListItem
  onDeleted: (flowId: string) => void
  onRenamed: (flowId: string, name: string, updatedAt: number) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setName(item.name)
  }, [item.name])

  const commitRename = async () => {
    const nextName = name.trim() || DEFAULT_FLOW_NAME
    setIsEditing(false)
    if (nextName === item.name) {
      setName(item.name)
      return
    }

    try {
      const result = await renameFlowFn({ data: { flowId: item.id, name: nextName } })
      syncLoadedFlowName(item.id, result.name)
      onRenamed(item.id, result.name, result.updatedAt)
      setName(result.name)
    } catch (error) {
      setName(item.name)
      console.error('重命名失败', error)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定删除「${item.name}」？此操作无法撤销。`)) return
    setIsDeleting(true)
    try {
      const result = await deleteFlowFn({ data: { flowId: item.id } })
      await Promise.all(
        result.imageNodeIds.map((nodeId) =>
          deleteFlowImage(nodeId).catch((error) => {
            console.error('删除图片缓存失败', error)
          }),
        ),
      )
      onDeleted(item.id)
    } catch (error) {
      console.error('删除流程失败', error)
      setIsDeleting(false)
    }
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md">
      {isEditing ? (
        <input
          value={name}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void commitRename()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
            if (event.key === 'Escape') {
              setName(item.name)
              setIsEditing(false)
            }
          }}
          className="w-full rounded-md border border-violet-300 px-2 py-1 text-base font-medium text-slate-900 outline-none ring-violet-500 focus:ring-2"
        />
      ) : (
        <Link
          to="/flows/$flowId"
          params={{ flowId: item.id }}
          className="block truncate text-base font-medium text-slate-900 hover:text-violet-700"
        >
          {item.name}
        </Link>
      )}
      <p className="mt-2 text-sm text-slate-500">
        {item.nodeCount} 个节点 · 更新于 {formatUpdatedAt(item.updatedAt)}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Link
          to="/flows/$flowId"
          params={{ flowId: item.id }}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          打开
        </Link>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          重命名
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isDeleting}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
        >
          {isDeleting ? '删除中…' : '删除'}
        </button>
      </div>
    </article>
  )
}
