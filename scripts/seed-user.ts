import { getDb } from '../src/db'
import { createUser } from '../src/server/auth'

const [username, password] = process.argv.slice(2)

if (!username || !password) {
  console.error('用法: bun run db:seed <用户名> <密码>')
  process.exit(1)
}

if (password.length < 8) {
  console.error('密码长度至少 8 位')
  process.exit(1)
}

try {
  getDb()
  await createUser(username, password)
  console.log(`用户 "${username}" 创建成功`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('UNIQUE constraint failed')) {
    console.error(`用户 "${username}" 已存在`)
    process.exit(1)
  }
  console.error('创建用户失败:', message)
  process.exit(1)
}
