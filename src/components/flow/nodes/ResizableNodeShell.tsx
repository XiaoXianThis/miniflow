import type { ReactNode } from 'react'
import { NodeResizer } from '@xyflow/react'

type ResizableNodeShellProps = {
  nodeId: string
  selected?: boolean
  minWidth?: number
  minHeight?: number
  className?: string
  children: ReactNode
}

export function ResizableNodeShell({
  nodeId,
  selected,
  minWidth = 160,
  minHeight = 100,
  className = '',
  children,
}: ResizableNodeShellProps) {
  return (
    <div className={`relative h-full w-full ${className}`}>
      <NodeResizer
        nodeId={nodeId}
        isVisible={selected}
        minWidth={minWidth}
        minHeight={minHeight}
        lineClassName="!border-blue-400"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border !border-blue-400 !bg-white"
      />
      <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
    </div>
  )
}
