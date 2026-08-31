import { useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

import { flowActions } from '#/stores/flow-store'
import {
  getImageFilesFromDataTransfer,
  hasImageFilesInDataTransfer,
  readImageFileAsBase64,
} from '../image-file'
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

async function loadImageIntoNode(nodeId: string, file: File) {
  const { base64, mimeType } = await readImageFileAsBase64(file)
  flowActions.setImageViewImage(nodeId, base64, mimeType)
}

export function ImageViewNode({
  id,
  data,
  selected,
}: NodeProps & { data: ImageViewNodeData }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const src =
    data.image && data.mimeType
      ? `data:${data.mimeType};base64,${data.image}`
      : null
  const size = NODE_DEFAULT_SIZES.imageView

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      await loadImageIntoNode(id, file)
    } catch (error) {
      console.error('上传图片失败', error)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    if (!hasImageFilesInDataTransfer(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (event: React.DragEvent) => {
    const files = getImageFilesFromDataTransfer(event.dataTransfer)
    if (!files.length) return

    event.preventDefault()
    event.stopPropagation()

    try {
      await loadImageIntoNode(id, files[0])
    } catch (error) {
      console.error('拖放图片失败', error)
    }
  }

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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        className={`nodrag flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded border bg-white ${
          src
            ? 'border-rose-200'
            : 'cursor-pointer border-dashed border-rose-300 hover:border-rose-400 hover:bg-rose-50/50'
        }`}
        onClick={() => {
          if (!src) fileInputRef.current?.click()
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {src ? (
          <img
            src={src}
            alt="图片预览"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="px-3 py-6 text-center text-sm text-slate-400">
            <p>点击或拖拽上传图片</p>
            <p className="mt-1 text-xs">也可连接上游节点输出</p>
          </div>
        )}
      </div>
      <div className="nodrag mt-2 flex shrink-0 gap-2">
        {src ? (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              更换图片
            </button>
            <button
              type="button"
              onClick={() => downloadImage(data.image!, data.mimeType!)}
              className="flex-1 rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
            >
              下载图片
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            上传图片
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-rose-500" />
    </ResizableNodeShell>
  )
}
