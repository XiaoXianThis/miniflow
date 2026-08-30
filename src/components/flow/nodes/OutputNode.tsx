import { Handle, Position, type NodeProps } from '@xyflow/react'

import { NODE_DEFAULT_SIZES, type OutputNodeData } from '../types'
import { NodeHeader } from './NodeDeleteButton'
import { ResizableNodeShell } from './ResizableNodeShell'

export function OutputNode({
  id,
  data,
  selected,
}: NodeProps & { data: OutputNodeData }) {
  const size = NODE_DEFAULT_SIZES.resultView

  return (
    <ResizableNodeShell
      nodeId={id}
      selected={selected}
      minWidth={size.minWidth}
      minHeight={size.minHeight}
      className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 shadow-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <NodeHeader title="输出结果" nodeId={id} className="text-emerald-900" />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden break-words rounded border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800">
        {data.result ?? <span className="text-slate-400">等待 Agent 输出…</span>}
      </div>
    </ResizableNodeShell>
  )
}
