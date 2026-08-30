import { Mastra } from '@mastra/core'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

const helloStep = createStep({
  id: 'hello-step',
  description: '根据姓名生成问候语',
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ message: z.string() }),
  execute: async ({ inputData }) => ({
    message: `hello, ${inputData.name}`,
  }),
})

export const helloAgentWorkflow = createWorkflow({
  id: 'hello-agent',
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ message: z.string() }),
})
  .then(helloStep)
  .commit()

export const mastra = new Mastra({
  workflows: { helloAgent: helloAgentWorkflow },
})

export async function runHelloAgent(name: string): Promise<string> {
  const workflow = mastra.getWorkflow('helloAgent')
  const run = await workflow.createRun()
  const result = await run.start({ inputData: { name } })

  if (result.status === 'success') {
    return result.result.message
  }

  throw new Error(
    result.status === 'failed' ? result.error.message : 'Hello agent 执行失败',
  )
}
