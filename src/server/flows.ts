import { and, desc, eq } from 'drizzle-orm'

import { getDb } from '#/db'
import { flows } from '#/db/schema'
import {
  DEFAULT_FLOW_NAME,
  extractImageNodeIds,
  parseFlowGraph,
  type FlowDocumentPayload,
  type FlowGraph,
  type FlowListItem,
} from '#/shared/flows'

export class FlowError extends Error {
  readonly code: 'NOT_FOUND'

  constructor(message: string, code: 'NOT_FOUND' = 'NOT_FOUND') {
    super(message)
    this.name = 'FlowError'
    this.code = code
  }
}

function toMillis(value: Date | number) {
  return value instanceof Date ? value.getTime() : value
}

function serializeGraph(graph: FlowGraph) {
  return JSON.stringify({
    nodes: graph.nodes,
    edges: graph.edges,
  })
}

async function getOwnedFlowRow(userId: string, flowId: string) {
  const db = getDb()
  const row = await db
    .select()
    .from(flows)
    .where(and(eq(flows.id, flowId), eq(flows.userId, userId)))
    .get()

  if (!row) {
    throw new FlowError('流程不存在', 'NOT_FOUND')
  }

  return row
}

export async function listFlowsForUser(userId: string): Promise<FlowListItem[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(flows)
    .where(eq(flows.userId, userId))
    .orderBy(desc(flows.updatedAt))

  return rows.map((row) => {
    const graph = parseFlowGraph(row.graph)
    return {
      id: row.id,
      name: row.name,
      createdAt: toMillis(row.createdAt),
      updatedAt: toMillis(row.updatedAt),
      nodeCount: graph.nodes.length,
    }
  })
}

export async function createFlowForUser(
  userId: string,
  input: { name?: string; nodes?: unknown[]; edges?: unknown[] } = {},
): Promise<FlowDocumentPayload> {
  const db = getDb()
  const now = new Date()
  const id = crypto.randomUUID()
  const name = input.name?.trim() || DEFAULT_FLOW_NAME
  const graph: FlowGraph = {
    nodes: input.nodes ?? [],
    edges: input.edges ?? [],
  }

  await db.insert(flows).values({
    id,
    userId,
    name,
    graph: serializeGraph(graph),
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    name,
    nodes: graph.nodes,
    edges: graph.edges,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  }
}

export async function getFlowForUser(
  userId: string,
  flowId: string,
): Promise<FlowDocumentPayload> {
  const row = await getOwnedFlowRow(userId, flowId)
  const graph = parseFlowGraph(row.graph)

  return {
    id: row.id,
    name: row.name,
    nodes: graph.nodes,
    edges: graph.edges,
    createdAt: toMillis(row.createdAt),
    updatedAt: toMillis(row.updatedAt),
  }
}

export async function saveFlowForUser(
  userId: string,
  input: {
    flowId: string
    name?: string
    nodes: unknown[]
    edges: unknown[]
  },
) {
  await getOwnedFlowRow(userId, input.flowId)

  const db = getDb()
  const now = new Date()
  const name =
    typeof input.name === 'string' ? input.name.trim() || DEFAULT_FLOW_NAME : undefined

  await db
    .update(flows)
    .set({
      graph: serializeGraph({ nodes: input.nodes, edges: input.edges }),
      updatedAt: now,
      ...(name ? { name } : {}),
    })
    .where(and(eq(flows.id, input.flowId), eq(flows.userId, userId)))

  return {
    id: input.flowId,
    name,
    updatedAt: now.getTime(),
  }
}

export async function renameFlowForUser(
  userId: string,
  flowId: string,
  name: string,
) {
  await getOwnedFlowRow(userId, flowId)

  const db = getDb()
  const now = new Date()
  const nextName = name.trim() || DEFAULT_FLOW_NAME

  await db
    .update(flows)
    .set({ name: nextName, updatedAt: now })
    .where(and(eq(flows.id, flowId), eq(flows.userId, userId)))

  return { id: flowId, name: nextName, updatedAt: now.getTime() }
}

export async function deleteFlowForUser(userId: string, flowId: string) {
  const row = await getOwnedFlowRow(userId, flowId)
  const imageNodeIds = extractImageNodeIds(parseFlowGraph(row.graph))

  const db = getDb()
  await db
    .delete(flows)
    .where(and(eq(flows.id, flowId), eq(flows.userId, userId)))

  return { id: flowId, imageNodeIds }
}
