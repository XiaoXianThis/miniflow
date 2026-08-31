import { Handle, Position, type NodeProps } from '@xyflow/react'

import { flowActions } from '#/stores/flow-store'
import {
  GPT_IMAGE_DEFAULTS,
  GPT_IMAGE_SIZE_PRESETS,
  formatGptImageSizeLabel,
  type GptImageBackground,
  type GptImageFormat,
  type GptImageModeration,
  type GptImageQuality,
  type GptImageSizePreset,
} from '../gpt-image-options'
import { NODE_DEFAULT_SIZES, type AgentStatus, type GptImageNodeData } from '../types'
import { NodeHeader } from './NodeDeleteButton'
import { ResizableNodeShell } from './ResizableNodeShell'

const statusLabel: Record<AgentStatus, string> = {
  idle: '待运行',
  running: '生成中…',
  done: '已完成',
  error: '失败',
}

const fieldClass =
  'nodrag w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-amber-500'
const labelClass = 'mb-1 block text-xs text-amber-800'

function getNodeOptions(data: GptImageNodeData) {
  return {
    model: data.model ?? GPT_IMAGE_DEFAULTS.model,
    size: data.size ?? GPT_IMAGE_DEFAULTS.size,
    customSize: data.customSize ?? GPT_IMAGE_DEFAULTS.customSize,
    quality: data.quality ?? GPT_IMAGE_DEFAULTS.quality,
    n: data.n ?? GPT_IMAGE_DEFAULTS.n,
    outputFormat: data.outputFormat ?? GPT_IMAGE_DEFAULTS.outputFormat,
    outputCompression:
      data.outputCompression ?? GPT_IMAGE_DEFAULTS.outputCompression,
    background: data.background ?? GPT_IMAGE_DEFAULTS.background,
    moderation: data.moderation ?? GPT_IMAGE_DEFAULTS.moderation,
    showAdvanced: data.showAdvanced ?? GPT_IMAGE_DEFAULTS.showAdvanced,
  }
}

export function GptImageNode({
  id,
  data,
  selected,
}: NodeProps & { data: GptImageNodeData }) {
  const options = getNodeOptions(data)
  const showCompression =
    options.outputFormat === 'jpeg' || options.outputFormat === 'webp'
  const size = NODE_DEFAULT_SIZES.gptImage

  return (
    <ResizableNodeShell
      nodeId={id}
      selected={selected}
      minWidth={size.minWidth}
      minHeight={size.minHeight}
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-amber-500" />
      <NodeHeader title="GPT 生图" nodeId={id} className="text-amber-900" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-3 text-xs text-amber-700">连接文本输入作为提示词</p>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>尺寸</label>
            <select
              value={options.size}
              onChange={(e) =>
                flowActions.updateNodeData(id, {
                  size: e.target.value as GptImageSizePreset,
                })
              }
              className={fieldClass}
            >
              {GPT_IMAGE_SIZE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>质量</label>
            <select
              value={options.quality}
              onChange={(e) =>
                flowActions.updateNodeData(id, {
                  quality: e.target.value as GptImageQuality,
                })
              }
              className={fieldClass}
            >
              <option value="auto">自动</option>
              <option value="low">低（快）</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>

        {options.size === 'custom' && (
          <div className="mb-2">
            <label className={labelClass}>自定义（宽×高，16 的倍数）</label>
            <input
              type="text"
              value={options.customSize}
              onChange={(e) =>
                flowActions.updateNodeData(id, { customSize: e.target.value })
              }
              placeholder="2048x1152"
              className={fieldClass}
            />
            <p className="mt-1 text-[11px] text-amber-600">
              当前：{formatGptImageSizeLabel('custom', options.customSize)}
            </p>
          </div>
        )}

        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>格式</label>
            <select
              value={options.outputFormat}
              onChange={(e) =>
                flowActions.updateNodeData(id, {
                  outputFormat: e.target.value as GptImageFormat,
                })
              }
              className={fieldClass}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>背景</label>
            <select
              value={options.background}
              onChange={(e) =>
                flowActions.updateNodeData(id, {
                  background: e.target.value as GptImageBackground,
                })
              }
              className={fieldClass}
            >
              <option value="auto">自动</option>
              <option value="opaque">不透明</option>
              <option value="transparent">透明</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            flowActions.updateNodeData(id, {
              showAdvanced: !options.showAdvanced,
            })
          }
          className="nodrag mb-2 text-xs text-amber-700 underline-offset-2 hover:underline"
        >
          {options.showAdvanced ? '收起高级选项' : '展开高级选项'}
        </button>

        {options.showAdvanced && (
          <div className="mb-2 space-y-2 rounded border border-amber-200 bg-white/70 p-2">
            <div>
              <label className={labelClass}>模型</label>
              <input
                type="text"
                value={options.model}
                onChange={(e) =>
                  flowActions.updateNodeData(id, { model: e.target.value })
                }
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>数量 n</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={options.n}
                  onChange={(e) =>
                    flowActions.updateNodeData(id, {
                      n: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>审核</label>
                <select
                  value={options.moderation}
                  onChange={(e) =>
                    flowActions.updateNodeData(id, {
                      moderation: e.target.value as GptImageModeration,
                    })
                  }
                  className={fieldClass}
                >
                  <option value="auto">标准</option>
                  <option value="low">宽松</option>
                </select>
              </div>
            </div>
            {showCompression && (
              <div>
                <label className={labelClass}>
                  压缩率 {options.outputCompression}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={options.outputCompression}
                  onChange={(e) =>
                    flowActions.updateNodeData(id, {
                      outputCompression: Number(e.target.value),
                    })
                  }
                  className="nodrag w-full"
                />
              </div>
            )}
            {options.n > 1 && (
              <p className="text-xs text-amber-600">多张时仅预览第一张</p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => flowActions.runGptImage(id)}
        disabled={data.status === 'running'}
        className="nodrag mt-2 shrink-0 w-full rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {data.status === 'running' ? '生成中…' : '生成图片'}
      </button>
      <p className="mt-2 shrink-0 text-xs text-amber-600">状态：{statusLabel[data.status]}</p>
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
    </ResizableNodeShell>
  )
}
