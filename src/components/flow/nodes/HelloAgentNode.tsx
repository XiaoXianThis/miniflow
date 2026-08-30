import { Handle, Position, type NodeProps } from '@xyflow/react'

import { flowActions } from '#/stores/flow-store'
import { NODE_DEFAULT_SIZES, type AgentStatus, type HelloAgentNodeData } from '../types'
import { NodeHeader } from './NodeDeleteButton'
import { ResizableNodeShell } from './ResizableNodeShell'

const statusLabel: Record<AgentStatus, string> = {
  idle: '待运行',
  running: '运行中…',
  done: '已完成',
  error: '失败',
}

export function HelloAgentNode({
  id,
  data,
  selected,
}: NodeProps & { data: HelloAgentNodeData }) {
  const size = NODE_DEFAULT_SIZES.helloAgent

  return (
    <ResizableNodeShell
      nodeId={id}
      selected={selected}
      minWidth={size.minWidth}
      minHeight={size.minHeight}
      className="rounded-lg border border-violet-300 bg-violet-50 p-4 shadow-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-violet-500" />
      <NodeHeader title="Hello Agent" nodeId={id} className="text-violet-900" />
      <p className="mb-3 text-xs text-violet-700">Mastra Workflow（无模型）</p>
      <button
        type="button"
        onClick={() => flowActions.runAgent(id)}
        disabled={data.status === 'running'}
        className="nodrag mt-auto w-full rounded bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {data.status === 'running' ? '运行中…' : '运行 Agent'}
      </button>
      <p className="mt-2 shrink-0 text-xs text-violet-600">状态：{statusLabel[data.status]}</p>
      <Handle type="source" position={Position.Right} className="!bg-violet-500" />
    </ResizableNodeShell>
  )
}
