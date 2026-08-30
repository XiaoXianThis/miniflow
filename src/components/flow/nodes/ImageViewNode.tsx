import { Handle, Position, type NodeProps } from '@xyflow/react'

import { NODE_DEFAULT_SIZES, type ImageViewNodeData } from '../types'
import { NodeHeader } from './NodeDeleteButton'
import { ResizableNodeShell } from './ResizableNodeShell'

function getDownloadExtension(mimeType: string) {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  if (mimeType.includes('webp')) return 'webp'
  return 'png'
}

function downloadImage(base64: string, mimeType: string) {
  const extension = getDownloadExtension(mimeType)
  const link = document.createElement('a')
  link.href = `data:${mimeType};base64,${base64}`
  link.download = `miniflow-image-${Date.now()}.${extension}`
  link.click()
}

export function ImageViewNode({
  id,
  data,
  selected,
}: NodeProps & { data: ImageViewNodeData }) {
  const src =
    data.image && data.mimeType
      ? `data:${data.mimeType};base64,${data.image}`
      : null
  const size = NODE_DEFAULT_SIZES.imageView

  return (
    <ResizableNodeShell
      nodeId={id}
      selected={selected}
      minWidth={size.minWidth}
      minHeight={size.minHeight}
      className="rounded-lg border border-rose-300 bg-rose-50 p-4 shadow-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-rose-500" />
      <NodeHeader title="图片查看" nodeId={id} className="text-rose-900" />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-rose-200 bg-white">
        {src ? (
          <img
            src={src}
            alt="生成的图片"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="px-3 py-6 text-sm text-slate-400">等待图片输出…</span>
        )}
      </div>
      {src && data.image && data.mimeType && (
        <button
          type="button"
          onClick={() => downloadImage(data.image!, data.mimeType!)}
          className="nodrag mt-2 shrink-0 w-full rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          下载图片
        </button>
      )}
    </ResizableNodeShell>
  )
}
