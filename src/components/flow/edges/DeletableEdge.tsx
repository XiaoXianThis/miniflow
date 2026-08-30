import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'

import { flowActions } from '#/stores/flow-store'

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#6366f1' : '#94a3b8',
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <button
            type="button"
            title="断开连接"
            aria-label="断开连接"
            onClick={() => flowActions.removeEdge(id)}
            className={`flex h-7 w-7 items-center justify-center rounded-full border bg-white text-base leading-none shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 ${
              selected
                ? 'border-indigo-300 text-indigo-600 opacity-100'
                : 'border-slate-300 text-slate-500 opacity-70 hover:opacity-100'
            }`}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
