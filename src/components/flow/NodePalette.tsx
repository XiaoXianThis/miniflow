import { Panel } from '@xyflow/react'

import { flowActions } from '#/stores/flow-store'
import type { FlowNodeType } from './types'

const paletteItems: { type: FlowNodeType; label: string; color: string }[] = [
  { type: 'textInput', label: '文本输入', color: 'bg-blue-600 hover:bg-blue-700' },
  { type: 'helloAgent', label: 'Hello Agent', color: 'bg-violet-600 hover:bg-violet-700' },
  { type: 'resultView', label: '输出结果', color: 'bg-emerald-600 hover:bg-emerald-700' },
  { type: 'gptImage', label: 'GPT 生图', color: 'bg-amber-600 hover:bg-amber-700' },
  { type: 'imageView', label: '图片查看', color: 'bg-rose-600 hover:bg-rose-700' },
  { type: 'exportPpt', label: '导出 PPT', color: 'bg-indigo-600 hover:bg-indigo-700' },
]

export function NodePalette({
  onAddNode,
}: {
  onAddNode: (type: FlowNodeType) => void
}) {
  const handleClearCanvas = () => {
    if (!window.confirm('确定清空画布？所有节点和连线将被删除，且无法撤销。')) {
      return
    }
    flowActions.clearCanvas()
  }

  return (
    <Panel
      position="top-left"
      className="!bottom-0 flex w-40 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur"
    >
      <div className="px-1 pt-0.5 text-xs font-medium text-slate-500">添加卡片</div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {paletteItems.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onAddNode(item.type)}
            className={`rounded px-3 py-1.5 text-sm font-medium text-white transition ${item.color}`}
          >
            + {item.label}
          </button>
        ))}
      </div>
      <div className="h-px w-full shrink-0 bg-slate-200" />
      <button
        type="button"
        onClick={handleClearCanvas}
        className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
      >
        清空画布
      </button>
    </Panel>
  )
}
