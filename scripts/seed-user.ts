import { createUser, updateUserPassword } from '../src/server/auth'

const args = process.argv.slice(2)
const force = args.includes('--force')
const [username, password] = args.filter((arg) => arg !== '--force')

if (!username || !password) {
  console.error('用法: bun run db:seed <用户名> <密码> [--force]')
  process.exit(1)
}

if (password.length < 8) {
  console.error('密码长度至少 8 位')
  process.exit(1)
}

try {
  await createUser(username, password)
  console.log(`用户 "${username}" 创建成功`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('UNIQUE constraint failed')) {
    if (!force) {
      console.error(`用户 "${username}" 已存在。如需重置密码，请加 --force`)
      process.exit(1)
    }

    await updateUserPassword(username, password)
    console.log(`用户 "${username}" 密码已更新`)
    process.exit(0)
  }
  console.error('创建用户失败:', message)
  process.exit(1)
}
