import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { clearTables, closeDb, resetDbForTests } from '#/db'
import { authenticateCredentials, createUser } from '#/server/auth'
import {
  createFlowForUser,
  deleteFlowForUser,
  FlowError,
  getFlowForUser,
  listFlowsForUser,
  renameFlowForUser,
  saveFlowForUser,
} from '#/server/flows'

const TEST_DB_PATH = 'data/test-flows.db'

async function createTestUser(username: string) {
  await createUser(username, 'password123')
  return authenticateCredentials(username, 'password123')
}

describe('flows', () => {
  beforeAll(() => {
    process.env.DATABASE_PATH = TEST_DB_PATH
    resetDbForTests(TEST_DB_PATH)
  })

  beforeEach(() => {
    clearTables()
  })

  afterAll(() => {
    closeDb()
  })

  test('creates, lists, loads, renames, saves and deletes a flow', async () => {
    const user = await createTestUser('alice')
    const created = await createFlowForUser(user.id, { name: '演示流程' })

    expect(created.name).toBe('演示流程')
    expect(created.nodes).toEqual([])
    expect(created.edges).toEqual([])

    const listed = await listFlowsForUser(user.id)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.id).toBe(created.id)
    expect(listed[0]?.nodeCount).toBe(0)

    const loaded = await getFlowForUser(user.id, created.id)
    expect(loaded.name).toBe('演示流程')

    const renamed = await renameFlowForUser(user.id, created.id, '  新名称  ')
    expect(renamed.name).toBe('新名称')

    await saveFlowForUser(user.id, {
      flowId: created.id,
      name: '已保存',
      nodes: [{ id: 'text-1', type: 'textInput', position: { x: 0, y: 0 }, data: { text: 'hi' } }],
      edges: [],
    })

    const saved = await getFlowForUser(user.id, created.id)
    expect(saved.name).toBe('已保存')
    expect(saved.nodes).toHaveLength(1)

    const listedAfterSave = await listFlowsForUser(user.id)
    expect(listedAfterSave[0]?.nodeCount).toBe(1)

    const deleted = await deleteFlowForUser(user.id, created.id)
    expect(deleted.id).toBe(created.id)
    expect(await listFlowsForUser(user.id)).toHaveLength(0)
  })

  test('does not expose another user flow', async () => {
    const alice = await createTestUser('alice')
    const bob = await createTestUser('bob')
    const created = await createFlowForUser(alice.id, { name: 'Alice 的流程' })

    expect(await listFlowsForUser(bob.id)).toHaveLength(0)
    await expect(getFlowForUser(bob.id, created.id)).rejects.toBeInstanceOf(FlowError)
    await expect(deleteFlowForUser(bob.id, created.id)).rejects.toBeInstanceOf(FlowError)
  })

  test('falls back to default name when blank', async () => {
    const user = await createTestUser('alice')
    const created = await createFlowForUser(user.id, { name: '   ' })
    expect(created.name).toBe('未命名流程')
  })
})
