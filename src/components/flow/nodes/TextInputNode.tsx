import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio/react'

import { flowActions } from '#/stores/flow-store'
import { useFlowStore } from '#/stores/flow-store-context'
import {
  assembleTextFromNode,
  hasUpstreamTextInputs,
} from '../text-assembly'
import { NODE_DEFAULT_SIZES, type TextInputNodeData } from '../types'
import { NodeHeader } from './NodeDeleteButton'
import { ResizableNodeShell } from './ResizableNodeShell'

export function TextInputNode({
  id,
  data,
  selected,
}: NodeProps & { data: TextInputNodeData }) {
  const flowStore = useFlowStore()
  const { nodes, edges } = useSnapshot(flowStore)
  const hasUpstream = hasUpstreamTextInputs(id, nodes, edges)
  const assembled = hasUpstream
    ? assembleTextFromNode(id, nodes, edges)
    : ''
  const size = NODE_DEFAULT_SIZES.textInput

  return (
    <ResizableNodeShell
      nodeId={id}
      selected={selected}
      minWidth={size.minWidth}
      minHeight={size.minHeight}
      className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <NodeHeader title="文本输入" nodeId={id} className="text-slate-800" />
      <textarea
        value={data.text}
        onChange={(e) => flowActions.updateNodeData(id, { text: e.target.value })}
        placeholder="请输入文本或提示词"
        className="nodrag min-h-0 flex-1 resize-none rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      {hasUpstream && (
        <div className="mt-2 shrink-0 rounded border border-blue-100 bg-blue-50 px-3 py-2">
          <div className="mb-1 text-xs font-medium text-blue-700">串联输出预览</div>
          <div className="max-h-20 overflow-y-auto whitespace-pre-wrap break-words text-xs text-slate-700">
            {assembled || <span className="text-slate-400">上游与当前内容为空</span>}
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </ResizableNodeShell>
  )
}
