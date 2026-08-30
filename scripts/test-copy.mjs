import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

const logs = []
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`))

try {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('.react-flow', { timeout: 15000 })

  const addTextBtn = page.getByRole('button', { name: /文本输入/ })
  if (await addTextBtn.count()) {
    await addTextBtn.click()
    await page.waitForTimeout(300)
  }

  const before = await page.locator('.react-flow__node').count()
  console.log('nodes before copy:', before)

  const copyBtn = page.locator('button[aria-label="复制并粘贴"]').first()
  await copyBtn.waitFor({ state: 'visible', timeout: 5000 })
  await copyBtn.click({ force: true })
  await page.waitForTimeout(500)

  const after = await page.locator('.react-flow__node').count()
  console.log('nodes after copy:', after)

  if (after > before) {
    console.log('PASS: duplicate created a new node')
  } else {
    console.log('FAIL: node count did not increase')
    process.exitCode = 1
  }
} catch (error) {
  console.error('TEST ERROR:', error)
  process.exitCode = 1
} finally {
  if (logs.length) {
    console.log('--- browser logs ---')
    logs.slice(-20).forEach((line) => console.log(line))
  }
  await browser.close()
}
