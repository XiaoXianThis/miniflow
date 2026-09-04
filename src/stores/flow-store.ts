import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import { proxy, snapshot, subscribe } from 'valtio'

import { runGptImageFn } from '#/mastra/run-gpt-image'
import { runHelloAgentFn } from '#/mastra/run-hello-agent'
import { getFlowFn, saveFlowFn } from '#/server/flow-fns'
import { DEFAULT_FLOW_NAME } from '#/shared/flows'
import {
  getDefaultNodeData,
  NODE_DEFAULT_SIZES,
  type AgentStatus,
  type FlowNodeType,
  type GptImageNodeData,
  type ImageViewNodeData,
  type ExportPptNodeData,
} from '#/components/flow/types'
import {
  buildPptxBlob,
  downloadBlob,
  resolveExportPptImages,
} from '#/components/flow/export-ppt'
import {
  assembleTextFromNode,
  wouldCreateTextInputCycle,
} from '#/components/flow/text-assembly'
import {
  GPT_IMAGE_DEFAULTS,
  GPT_IMAGE_MAX_REFERENCE_IMAGES,
  resolveGptImageSize,
} from '#/components/flow/gpt-image-options'
import {
  collectGptImageReferenceEntries,
  countReadyGptImageReferences,
  resolveGptImageReferences,
} from '#/components/flow/gpt-image-references'
import { isAuthFailure } from '#/shared/auth'
import {
  deleteFlowImage,
  duplicateFlowImage,
  getFlowImage,
  saveFlowImage,
} from './flow-image-store'
import { toPersistedGraph } from './flow-persist-serializer'

export type FlowSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface FlowPersistedState {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
}

const defaultState: FlowPersistedState = {
  id: '',
  name: DEFAULT_FLOW_NAME,
  nodes: [],
  edges: [],
}

declare global {
  interface Window {
    __miniflowStore?: FlowPersistedState
  }
}

const SAVE_DEBOUNCE_MS = 300

export let flowStore: FlowPersistedState | undefined
export const flowSaveStore = proxy({
  saveStatus: 'idle' as FlowSaveStatus,
})

let hydrating = false
let persistTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribePersist: (() => void) | null = null
let storeQueue: Promise<void> = Promise.resolve()

function enqueueStoreTask<T>(task: () => Promise<T>): Promise<T> {
  const run = storeQueue.then(task, task)
  storeQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

type FlowClipboard = {
  nodes: Node[]
  edges: Edge[]
}

let clipboard: FlowClipboard | null = null
let pasteCount = 0

function normalizeAgentStatus(status?: AgentStatus): AgentStatus {
  if (status === 'running') return 'idle'
  return status ?? 'idle'
}

function cloneNodeData(data: Record<string, unknown>, type: string) {
  const cloned = toPlain(data)

  if (type === 'helloAgent' || type === 'gptImage' || type === 'exportPpt') {
    cloned.status = normalizeAgentStatus(cloned.status as AgentStatus | undefined)
  }

  return cloned
}

function migrateLegacyNodes(store: FlowPersistedState) {
  store.nodes = store.nodes.map((node) => {
    if (node.type === 'output') {
      return { ...node, type: 'resultView' }
    }

    if (node.type === 'nameInput') {
      const legacy = node.data as { name?: string }
      return {
        ...node,
        type: 'textInput',
        data: { text: legacy.name ?? '' },
      }
    }

    if (node.type === 'helloAgent') {
      const legacy = node.data as { status?: AgentStatus }
      return {
        ...node,
        data: { status: normalizeAgentStatus(legacy.status) },
      }
    }

    if (node.type === 'gptImage') {
      const legacy = node.data as Partial<GptImageNodeData>
      return {
        ...node,
        data: {
          ...GPT_IMAGE_DEFAULTS,
          ...legacy,
          status: normalizeAgentStatus(legacy.status),
        },
      }
    }

    if (node.type === 'imageView') {
      const legacy = node.data as Partial<ImageViewNodeData>
      return {
        ...node,
        data: {
          image: legacy.image ?? null,
          mimeType: legacy.mimeType ?? null,
          imageRef: legacy.imageRef ?? null,
        },
      }
    }

    return node
  }).map((node) => ({ ...node, deletable: true }))

  store.edges = store.edges.map((edge) => ({
    ...edge,
    type: edge.type ?? 'deletable',
  }))
}

async function hydrateImageViews(store: FlowPersistedState) {
  const updates = new Map<string, Partial<ImageViewNodeData>>()

  for (const node of store.nodes) {
    if (node.type !== 'imageView') continue

    const data = node.data as ImageViewNodeData

    if (data.image && data.mimeType) {
      try {
        await saveFlowImage(node.id, data.image, data.mimeType)
      } catch (error) {
        console.error('迁移图片到 IndexedDB 失败', error)
      }
      updates.set(node.id, { imageRef: node.id })
      continue
    }

    if (!data.image) {
      const ref = data.imageRef ?? node.id
      try {
        const stored = await getFlowImage(ref)
        if (stored) {
          updates.set(node.id, {
            image: stored.base64,
            mimeType: stored.mimeType,
            imageRef: ref,
          })
        }
      } catch (error) {
        console.error('从 IndexedDB 恢复图片失败', error)
      }
    }
  }

  if (updates.size === 0) return

  store.nodes = store.nodes.map((node) => {
    const patch = updates.get(node.id)
    return patch ? { ...node, data: { ...node.data, ...patch } } : node
  })
}

function schedulePersistFlush() {
  if (hydrating || !flowStore?.id) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void flushFlowStore()
  }, SAVE_DEBOUNCE_MS)
}

function captureSavePayload() {
  const store = getFlowStore()
  const snap = snapshot(store)
  const graph = toPersistedGraph({
    nodes: snap.nodes as Node[],
    edges: snap.edges as Edge[],
  })

  return {
    flowId: snap.id,
    name: snap.name,
    nodes: graph.nodes,
    edges: graph.edges,
  }
}

async function persistImageViewNodes(
  imageNodeId: string,
  image: string | null,
  mimeType: string | null,
) {
  const store = getFlowStore()
  const outputIds = store.edges
    .filter((edge) => edge.source === imageNodeId)
    .map((edge) => edge.target)

  for (const nodeId of outputIds) {
    const node = store.nodes.find((item) => item.id === nodeId)
    if (!node || node.type !== 'imageView') continue

    try {
      if (image && mimeType) {
        await saveFlowImage(nodeId, image, mimeType)
      } else if (image === null) {
        await deleteFlowImage(nodeId)
      }
    } catch (error) {
      console.error('图片持久化失败', error)
    }
  }
}

export async function flushFlowStore() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }

  if (hydrating || !flowStore?.id) return

  const payload = captureSavePayload()
  if (!payload.flowId) return

  flowSaveStore.saveStatus = 'saving'

  try {
    await saveFlowFn({ data: payload })
    flowSaveStore.saveStatus = 'saved'
  } catch (error) {
    flowSaveStore.saveStatus = 'error'
    console.error('流程状态保存失败', error)
  }
}

function bindPersistSubscription(store: FlowPersistedState) {
  unsubscribePersist?.()
  unsubscribePersist = subscribe(store, () => {
    schedulePersistFlush()
  })
}

export async function initFlowStore() {
  if (flowStore) return flowStore

  if (typeof window !== 'undefined' && window.__miniflowStore?.id !== undefined) {
    flowStore = window.__miniflowStore
    bindPersistSubscription(flowStore)
    return flowStore
  }

  if (typeof window === 'undefined') {
    throw new Error('initFlowStore must only run in the browser')
  }

  const store = proxy<FlowPersistedState>(toPlain(defaultState))
  flowStore = store
  window.__miniflowStore = store
  bindPersistSubscription(store)
  return store
}

export async function loadFlowDocument(flowId: string) {
  const store = await initFlowStore()

  return enqueueStoreTask(async () => {
    if (store.id && store.id !== flowId) {
      await flushFlowStore()
    }

    hydrating = true
    flowSaveStore.saveStatus = 'idle'

    try {
      const doc = await getFlowFn({ data: { flowId } })
      store.id = doc.id
      store.name = doc.name
      store.nodes = toPlain(doc.nodes as Node[])
      store.edges = toPlain(doc.edges as Edge[])
      migrateLegacyNodes(store)
      await hydrateImageViews(store)
      flowSaveStore.saveStatus = 'saved'
    } finally {
      hydrating = false
    }

    return store
  })
}

export async function unloadFlowDocument() {
  return enqueueStoreTask(async () => {
    await flushFlowStore()
    if (!flowStore) return
    hydrating = true
    try {
      flowStore.id = ''
    } finally {
      hydrating = false
    }
  })
}

export function syncLoadedFlowName(flowId: string, name: string) {
  if (!flowStore || flowStore.id !== flowId) return
  hydrating = true
  flowStore.name = name
  hydrating = false
}

function getFlowStore() {
  if (!flowStore) {
    throw new Error('flowStore is not initialized — call initFlowStore() first')
  }
  return flowStore
}

export function isValidFlowConnection(
  connection: { source: string | null; target: string | null },
  nodes: Node[],
) {
  if (!connection.source || !connection.target) return false

  const source = nodes.find((node) => node.id === connection.source)
  const target = nodes.find((node) => node.id === connection.target)
  if (!source || !target) return false

  if (source.type === 'textInput' && target.type === 'helloAgent') return true
  if (source.type === 'textInput' && target.type === 'gptImage') return true
  if (source.type === 'imageView' && target.type === 'gptImage') return true
  if (source.type === 'textInput' && target.type === 'textInput') {
    return !wouldCreateTextInputCycle(
      connection.source,
      connection.target,
      nodes,
      getFlowStore().edges,
    )
  }
  if (source.type === 'helloAgent' && target.type === 'resultView') return true
  if (source.type === 'gptImage' && target.type === 'imageView') return true
  if (source.type === 'imageView' && target.type === 'exportPpt') return true

  return false
}

function getAssembledTextFromConnection(nodeId: string) {
  const store = getFlowStore()
  const incoming = store.edges.find((edge) => {
    if (edge.target !== nodeId) return false
    const sourceNode = store.nodes.find((node) => node.id === edge.source)
    return sourceNode?.type === 'textInput'
  })
  if (!incoming) return null

  const sourceNode = store.nodes.find((node) => node.id === incoming.source)
  if (!sourceNode || sourceNode.type !== 'textInput') return null

  return assembleTextFromNode(
    sourceNode.id,
    store.nodes,
    store.edges,
  ).trim()
}

export const flowActions = {
  setFlowName(name: string) {
    const store = getFlowStore()
    store.name = name
  },

  onNodesChange(changes: NodeChange[]) {
    const store = getFlowStore()
    const removedIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => change.id)

    const removedImageViewIds = removedIds.filter((id) => {
      const node = store.nodes.find((item) => item.id === id)
      return node?.type === 'imageView'
    })

    store.nodes = applyNodeChanges(changes, store.nodes)

    if (removedIds.length > 0) {
      for (const nodeId of removedImageViewIds) {
        void deleteFlowImage(nodeId).catch((error) => {
          console.error('删除图片缓存失败', error)
        })
      }
      store.edges = store.edges.filter(
        (edge) =>
          !removedIds.includes(edge.source) && !removedIds.includes(edge.target),
      )
    }
  },

  onEdgesChange(changes: EdgeChange[]) {
    const store = getFlowStore()
    store.edges = applyEdgeChanges(changes, store.edges)
  },

  onConnect(connection: Connection) {
    const store = getFlowStore()
    store.edges = addEdge(
      { ...connection, type: 'deletable' },
      store.edges,
    )
  },

  removeEdge(edgeId: string) {
    const store = getFlowStore()
    store.edges = store.edges.filter((edge) => edge.id !== edgeId)
  },

  removeNode(nodeId: string) {
    const store = getFlowStore()
    const node = store.nodes.find((item) => item.id === nodeId)
    if (node?.type === 'imageView') {
      void deleteFlowImage(nodeId).catch((error) => {
        console.error('删除图片缓存失败', error)
      })
    }
    store.nodes = store.nodes.filter((node) => node.id !== nodeId)
    store.edges = store.edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    )
  },

  clearCanvas() {
    const store = getFlowStore()
    for (const node of store.nodes) {
      if (node.type === 'imageView') {
        void deleteFlowImage(node.id).catch((error) => {
          console.error('删除图片缓存失败', error)
        })
      }
    }
    store.nodes = []
    store.edges = []
    clipboard = null
    pasteCount = 0
  },

  copyNodes(nodeIds: string[]) {
    const store = getFlowStore()
    const idSet = new Set(nodeIds)
    const nodes = store.nodes
      .filter((node) => idSet.has(node.id))
      .map((node) => toPlain(node))

    if (nodes.length === 0) return

    const edges = store.edges
      .filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))
      .map((edge) => toPlain(edge))

    clipboard = { nodes, edges }
    pasteCount = 0
  },

  copySelectedNodes() {
    const store = getFlowStore()
    const nodeIds = store.nodes
      .filter((node) => node.selected)
      .map((node) => node.id)
    if (nodeIds.length === 0) return
    flowActions.copyNodes(nodeIds)
  },

  pasteClipboard() {
    const store = getFlowStore()
    if (!clipboard || clipboard.nodes.length === 0) return

    pasteCount += 1
    const offset = { x: 40 * pasteCount, y: 40 * pasteCount }
    const idMap = new Map<string, string>()

    const newNodes = clipboard.nodes.map((node) => {
      const newId = `${node.type}-${crypto.randomUUID()}`
      idMap.set(node.id, newId)

      const baseData =
        node.type === 'helloAgent' ||
        node.type === 'gptImage' ||
        node.type === 'exportPpt'
          ? cloneNodeData(
              node.data as Record<string, unknown>,
              node.type ?? '',
            )
          : toPlain(node.data)

      const data =
        node.type === 'imageView'
          ? { ...(baseData as ImageViewNodeData), imageRef: newId }
          : baseData

      return {
        ...toPlain(node),
        id: newId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        data,
        selected: true,
        deletable: true,
      }
    })

    const newEdges = clipboard.edges.map((edge) => ({
      ...toPlain(edge),
      id: `edge-${crypto.randomUUID()}`,
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
      type: edge.type ?? 'deletable',
    }))

    store.nodes = [
      ...store.nodes.map((node) => ({ ...toPlain(node), selected: false })),
      ...newNodes,
    ]
    store.edges = [...store.edges, ...newEdges]

    for (const node of newNodes) {
      if (node.type !== 'imageView') continue
      const sourceNode = clipboard!.nodes.find(
        (item) => idMap.get(item.id) === node.id,
      )
      if (!sourceNode) continue

      const sourceData = sourceNode.data as ImageViewNodeData
      if (sourceData.image && sourceData.mimeType) {
        void saveFlowImage(node.id, sourceData.image, sourceData.mimeType).catch(
          (error) => {
            console.error('粘贴图片失败', error)
          },
        )
      } else if (sourceData.imageRef) {
        void duplicateFlowImage(sourceData.imageRef, node.id).catch((error) => {
          console.error('复制图片失败', error)
        })
      }
    }
  },

  duplicateNode(nodeId: string) {
    flowActions.copyNodes([nodeId])
    flowActions.pasteClipboard()
  },

  duplicateSelectedNodes() {
    flowActions.copySelectedNodes()
    flowActions.pasteClipboard()
  },

  onReconnect(oldEdge: Edge, newConnection: Connection) {
    const store = getFlowStore()
    store.edges = reconnectEdge(oldEdge, newConnection, store.edges)
  },

  addNode(type: FlowNodeType, position: { x: number; y: number }) {
    const store = getFlowStore()
    const size = NODE_DEFAULT_SIZES[type]
    const newNode: Node = {
      id: `${type}-${crypto.randomUUID()}`,
      type,
      position,
      data: getDefaultNodeData(type),
      width: size.width,
      height: size.height,
      style: { width: size.width, height: size.height },
      deletable: true,
    }

    store.nodes = [...store.nodes, newNode]
  },

  updateNodeData(nodeId: string, data: Record<string, unknown>) {
    const store = getFlowStore()
    store.nodes = store.nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node,
    )
  },

  setNodeStatus(nodeId: string, status: AgentStatus) {
    flowActions.updateNodeData(nodeId, { status })
  },

  setOutputResults(agentNodeId: string, result: string | null) {
    const store = getFlowStore()
    const outputIds = store.edges
      .filter((edge) => edge.source === agentNodeId)
      .map((edge) => edge.target)

    store.nodes = store.nodes.map((node) =>
      outputIds.includes(node.id) && node.type === 'resultView'
        ? { ...node, data: { ...node.data, result } }
        : node,
    )
  },

  setImageViewImage(
    imageViewNodeId: string,
    image: string | null,
    mimeType: string | null = null,
  ) {
    const store = getFlowStore()
    const node = store.nodes.find((item) => item.id === imageViewNodeId)
    if (!node || node.type !== 'imageView') return

    store.nodes = store.nodes.map((item) => {
      if (item.id !== imageViewNodeId) return item

      if (image && mimeType) {
        return {
          ...item,
          data: {
            ...item.data,
            image,
            mimeType,
            imageRef: item.id,
          },
        }
      }

      if (image === null) {
        return {
          ...item,
          data: {
            ...item.data,
            image: null,
            mimeType: null,
            imageRef: null,
          },
        }
      }

      return item
    })

    void (async () => {
      try {
        if (image && mimeType) {
          await saveFlowImage(imageViewNodeId, image, mimeType)
        } else if (image === null) {
          await deleteFlowImage(imageViewNodeId)
        }
      } catch (error) {
        console.error('图片持久化失败', error)
      }
      schedulePersistFlush()
    })()
  },

  addImageViewWithImage(
    position: { x: number; y: number },
    image: string,
    mimeType: string,
  ) {
    const store = getFlowStore()
    const size = NODE_DEFAULT_SIZES.imageView
    const newNode: Node = {
      id: `imageView-${crypto.randomUUID()}`,
      type: 'imageView',
      position,
      data: getDefaultNodeData('imageView'),
      width: size.width,
      height: size.height,
      style: { width: size.width, height: size.height },
      deletable: true,
    }

    store.nodes = [...store.nodes, newNode]
    flowActions.setImageViewImage(newNode.id, image, mimeType)
    return newNode.id
  },

  setImageResults(
    imageNodeId: string,
    image: string | null,
    mimeType: string | null = null,
  ) {
    const store = getFlowStore()
    const outputIds = store.edges
      .filter((edge) => edge.source === imageNodeId)
      .map((edge) => edge.target)

    store.nodes = store.nodes.map((node) => {
      if (!outputIds.includes(node.id) || node.type !== 'imageView') {
        return node
      }

      if (image && mimeType) {
        return {
          ...node,
          data: {
            ...node.data,
            image,
            mimeType,
            imageRef: node.id,
          },
        }
      }

      if (image === null) {
        return {
          ...node,
          data: {
            ...node.data,
            image: null,
            mimeType: null,
            imageRef: null,
          },
        }
      }

      return node
    })

    void persistImageViewNodes(imageNodeId, image, mimeType).then(() => {
      schedulePersistFlush()
    })
  },

  async runAgent(agentNodeId: string) {
    const text = getAssembledTextFromConnection(agentNodeId)
    if (text === null) {
      flowActions.setNodeStatus(agentNodeId, 'error')
      flowActions.setOutputResults(agentNodeId, '请连接文本输入节点')
      return
    }

    if (!text) {
      flowActions.setNodeStatus(agentNodeId, 'error')
      flowActions.setOutputResults(agentNodeId, '请先输入文本')
      return
    }

    flowActions.setNodeStatus(agentNodeId, 'running')

    try {
      const { message } = await runHelloAgentFn({ data: { name: text } })
      flowActions.setNodeStatus(agentNodeId, 'done')
      flowActions.setOutputResults(agentNodeId, message)
      schedulePersistFlush()
    } catch (error) {
      flowActions.setNodeStatus(agentNodeId, 'error')
      flowActions.setOutputResults(
        agentNodeId,
        isAuthFailure(error) ? '请先登录' : 'Agent 执行失败',
      )
      schedulePersistFlush()
    }
  },

  async runGptImage(imageNodeId: string) {
    const store = getFlowStore()
    const prompt = getAssembledTextFromConnection(imageNodeId)
    if (prompt === null) {
      flowActions.setNodeStatus(imageNodeId, 'error')
      return
    }

    if (!prompt) {
      flowActions.setNodeStatus(imageNodeId, 'error')
      return
    }

    const referenceEntries = collectGptImageReferenceEntries(
      store.nodes,
      store.edges,
      imageNodeId,
    )
    const connectedReferences = referenceEntries.length
    const readyReferences = countReadyGptImageReferences(
      referenceEntries,
      store.nodes,
    )

    if (connectedReferences > 0 && readyReferences === 0) {
      flowActions.setNodeStatus(imageNodeId, 'error')
      return
    }

    flowActions.setNodeStatus(imageNodeId, 'running')

    const node = store.nodes.find((item) => item.id === imageNodeId)
    const imageData = (node?.data ?? {}) as GptImageNodeData

    try {
      const referenceImages =
        connectedReferences > 0
          ? await resolveGptImageReferences(
              store.nodes,
              store.edges,
              imageNodeId,
              getFlowImage,
            )
          : undefined

      if (connectedReferences > 0 && (referenceImages?.length ?? 0) === 0) {
        flowActions.setNodeStatus(imageNodeId, 'error')
        return
      }

      if (connectedReferences > GPT_IMAGE_MAX_REFERENCE_IMAGES) {
        console.warn(
          `GPT 生图仅使用前 ${GPT_IMAGE_MAX_REFERENCE_IMAGES} 张参考图`,
        )
      }

      const { base64, mimeType } = await runGptImageFn({
        data: {
          prompt,
          model: imageData.model ?? GPT_IMAGE_DEFAULTS.model,
          size: resolveGptImageSize(
            imageData.size ?? GPT_IMAGE_DEFAULTS.size,
            imageData.customSize ?? GPT_IMAGE_DEFAULTS.customSize,
          ),
          quality: imageData.quality ?? GPT_IMAGE_DEFAULTS.quality,
          n: imageData.n ?? GPT_IMAGE_DEFAULTS.n,
          outputFormat: imageData.outputFormat ?? GPT_IMAGE_DEFAULTS.outputFormat,
          outputCompression:
            imageData.outputCompression ?? GPT_IMAGE_DEFAULTS.outputCompression,
          background: imageData.background ?? GPT_IMAGE_DEFAULTS.background,
          moderation: imageData.moderation ?? GPT_IMAGE_DEFAULTS.moderation,
          referenceImages,
        },
      })
      flowActions.setNodeStatus(imageNodeId, 'done')
      flowActions.setImageResults(imageNodeId, base64, mimeType)
    } catch (error) {
      flowActions.setNodeStatus(imageNodeId, 'error')
      schedulePersistFlush()
      if (isAuthFailure(error)) {
        console.error('GPT 生图失败：未登录', error)
      } else {
        console.error('GPT 生图失败', error)
      }
    }
  },

  async exportPpt(exportNodeId: string) {
    const store = getFlowStore()
    const node = store.nodes.find((item) => item.id === exportNodeId)
    if (!node || node.type !== 'exportPpt') return

    const exportData = node.data as ExportPptNodeData
    const layout = exportData.layout ?? '16x9'
    const imageFit = exportData.imageFit ?? 'cover'

    flowActions.setNodeStatus(exportNodeId, 'running')
    flowActions.updateNodeData(exportNodeId, { lastError: null })

    try {
      const images = await resolveExportPptImages(
        store.nodes,
        store.edges,
        exportNodeId,
        getFlowImage,
      )

      if (images.length === 0) {
        flowActions.setNodeStatus(exportNodeId, 'error')
        flowActions.updateNodeData(exportNodeId, {
          lastError: '请连接至少一个含图片的图片查看节点',
        })
        return
      }

      const blob = await buildPptxBlob(images, { layout, imageFit })
      downloadBlob(blob, `miniflow-${Date.now()}.pptx`)
      flowActions.setNodeStatus(exportNodeId, 'done')
      schedulePersistFlush()
    } catch (error) {
      flowActions.setNodeStatus(exportNodeId, 'error')
      flowActions.updateNodeData(exportNodeId, {
        lastError: '导出 PPT 失败，请稍后重试',
      })
      schedulePersistFlush()
      console.error('导出 PPT 失败', error)
    }
  },
}
