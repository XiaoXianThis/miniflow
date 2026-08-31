import { useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio/react'

import { flowActions } from '#/stores/flow-store'
import { useFlowStore } from '#/stores/flow-store-context'
import {
  collectExportPptImages,
  countReadyExportImages,
} from '../export-ppt'
import {
  NODE_DEFAULT_SIZES,
  type AgentStatus,
  type ExportPptNodeData,
  type PptImageFit,
  type PptLayout,
} from '../types'
import { NodeHeader } from './NodeDeleteButton'
import { ResizableNodeShell } from './ResizableNodeShell'

const statusLabel: Record<AgentStatus, string> = {
  idle: '待导出',
  running: '导出中…',
  done: '已完成',
  error: '失败',
}

const fieldClass =
  'nodrag w-full rounded border border-indigo-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-500'
const labelClass = 'mb-1 block text-xs text-indigo-800'

export function ExportPptNode({
  id,
  data,
  selected,
}: NodeProps & { data: ExportPptNodeData }) {
  const flowStore = useFlowStore()
  const { nodes, edges } = useSnapshot(flowStore)
  const size = NODE_DEFAULT_SIZES.exportPpt
  const layout = data.layout ?? '16x9'
  const imageFit = data.imageFit ?? 'cover'

  const { connected, ready } = useMemo(() => {
    const entries = collectExportPptImages(
      nodes as typeof flowStore.nodes,
      edges as typeof flowStore.edges,
      id,
    )
    return {
      connected: entries.length,
      ready: countReadyExportImages(entries, nodes as typeof flowStore.nodes),
    }
  }, [nodes, edges, id, flowStore.nodes, flowStore.edges])

  return (
    <ResizableNodeShell
      nodeId={id}
      selected={selected}
      minWidth={size.minWidth}
      minHeight={size.minHeight}
      className="rounded-lg border border-indigo-300 bg-indigo-50 p-4 shadow-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-indigo-500" />
      <NodeHeader title="导出 PPT" nodeId={id} className="shrink-0 text-indigo-900" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 text-xs text-indigo-700">
          连接图片查看节点，按纵向位置排序，每页一图
        </p>
        <p className="mb-3 text-xs text-indigo-600">
          已连接 {connected} 个节点，{ready} 个含图片
        </p>
        <div className="mb-2">
          <label className={labelClass}>图片处理</label>
          <select
            value={imageFit}
            onChange={(event) =>
              flowActions.updateNodeData(id, {
                imageFit: event.target.value as PptImageFit,
              })
            }
            className={fieldClass}
          >
            <option value="cover">放大填满</option>
            <option value="stretch">拉伸填满</option>
            <option value="fillWidth">占满宽度</option>
            <option value="fillHeight">占满高度</option>
          </select>
        </div>
        <div className="mb-1">
          <label className={labelClass}>幻灯片尺寸</label>
          <select
            value={layout}
            onChange={(event) =>
              flowActions.updateNodeData(id, {
                layout: event.target.value as PptLayout,
              })
            }
            className={fieldClass}
          >
            <option value="16x9">16:9 宽屏</option>
            <option value="4x3">4:3 标准</option>
            <option value="followImage">跟随图片尺寸</option>
          </select>
          {layout === 'followImage' && (
            <p className="mt-1 text-[11px] leading-4 text-indigo-500">
              多图时以首张图片比例作为整份 PPT 的幻灯片尺寸
            </p>
          )}
        </div>
        {data.lastError && (
          <p className="mt-2 text-xs text-red-600">{data.lastError}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => flowActions.exportPpt(id)}
        disabled={data.status === 'running' || ready === 0}
        className="nodrag mt-2 shrink-0 w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {data.status === 'running' ? '导出中…' : '导出 .pptx'}
      </button>
      <p className="mt-2 shrink-0 text-xs text-indigo-600">
        状态：{statusLabel[data.status]}
      </p>
    </ResizableNodeShell>
  )
}
