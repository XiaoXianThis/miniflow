import { flowActions } from '#/stores/flow-store'

export function NodeCopyButton({ nodeId }: { nodeId: string }) {
  return (
    <button
      type="button"
      title="复制并粘贴"
      aria-label="复制并粘贴"
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        flowActions.duplicateNode(nodeId)
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-xs leading-none text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
    >
      ⎘
    </button>
  )
}

export function NodeDeleteButton({ nodeId }: { nodeId: string }) {
  return (
    <button
      type="button"
      title="删除节点"
      aria-label="删除节点"
      onClick={() => flowActions.removeNode(nodeId)}
      className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm leading-none text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
    >
      ×
    </button>
  )
}

export function NodeHeader({
  title,
  nodeId,
  className,
}: {
  title: string
  nodeId: string
  className?: string
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className={`text-sm font-semibold ${className ?? 'text-slate-800'}`}>
        {title}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NodeCopyButton nodeId={nodeId} />
        <NodeDeleteButton nodeId={nodeId} />
      </div>
    </div>
  )
}
