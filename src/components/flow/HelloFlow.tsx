import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import { useSnapshot } from 'valtio/react'
import '@xyflow/react/dist/style.css'

import { UserBar } from '#/components/auth/UserBar'
import { NodePalette } from './NodePalette'
import { DeletableEdge } from './edges/DeletableEdge'
import { GptImageNode } from './nodes/GptImageNode'
import { HelloAgentNode } from './nodes/HelloAgentNode'
import { ImageViewNode } from './nodes/ImageViewNode'
import { OutputNode } from './nodes/OutputNode'
import { TextInputNode } from './nodes/TextInputNode'
import type { FlowNodeType } from './types'
import {
  flowActions,
  flushFlowStore,
  initFlowStore,
  isValidFlowConnection,
  type FlowPersistedState,
} from '#/stores/flow-store'
import { FlowStoreProvider, useFlowStore } from '#/stores/flow-store-context'

const nodeTypes = {
  textInput: TextInputNode,
  helloAgent: HelloAgentNode,
  resultView: OutputNode,
  gptImage: GptImageNode,
  imageView: ImageViewNode,
}

const edgeTypes = {
  deletable: DeletableEdge,
}

function FlowCanvas() {
  const flowStore = useFlowStore()
  const { nodes, edges } = useSnapshot(flowStore)
  const { screenToFlowPosition } = useReactFlow()
  const paneRef = useRef<HTMLDivElement>(null)

  const addNode = useCallback(
    (type: FlowNodeType) => {
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      const offset = flowStore.nodes.length * 24
      flowActions.addNode(type, {
        x: center.x - 100 + offset,
        y: center.y - 50 + offset,
      })
    },
    [screenToFlowPosition],
  )

  const isValidConnection = useCallback(
    (connection: Parameters<typeof isValidFlowConnection>[0]) =>
      isValidFlowConnection(connection, flowStore.nodes),
    [],
  )

  const onReconnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, edge: { id: string }) => {
      const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
      const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY
      const handle = document.elementFromPoint(clientX, clientY)

      if (!handle?.classList.contains('react-flow__handle')) {
        flowActions.removeEdge(edge.id)
      }
    },
    [],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        flowActions.copySelectedNodes()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        flowActions.pasteClipboard()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        flowActions.duplicateSelectedNodes()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  return (
    <div
      ref={paneRef}
      className="h-full w-full outline-none"
      tabIndex={0}
      onPointerDown={() => paneRef.current?.focus({ preventScroll: true })}
    >
      <ReactFlow
        className="h-full w-full"
        nodes={nodes as typeof flowStore.nodes}
        edges={edges as typeof flowStore.edges}
        onNodesChange={flowActions.onNodesChange}
        onEdgesChange={flowActions.onEdgesChange}
        onConnect={flowActions.onConnect}
        onReconnect={flowActions.onReconnect}
        onReconnectEnd={onReconnectEnd}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'deletable' }}
        fitView
        nodesDraggable
        nodesConnectable
        edgesReconnectable
        elementsSelectable
        edgesFocusable
        connectionRadius={48}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={16} size={1} />
        <Controls />
        <NodePalette onAddNode={addNode} />
      </ReactFlow>
    </div>
  )
}

export function HelloFlow() {
  const [store, setStore] = useState<FlowPersistedState | null>(null)

  useEffect(() => {
    let cancelled = false
    initFlowStore().then((initialized) => {
      if (!cancelled) setStore(initialized)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const flush = () => {
      void flushFlowStore()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  if (!store) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        加载流程编辑器…
      </div>
    )
  }

  return (
    <FlowStoreProvider store={store}>
      <ReactFlowProvider>
        <div className="flex h-full w-full flex-col">
          <UserBar />
          <div className="min-h-0 flex-1">
            <FlowCanvas />
          </div>
        </div>
      </ReactFlowProvider>
    </FlowStoreProvider>
  )
}
