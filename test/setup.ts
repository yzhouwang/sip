import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

// Reset IndexedDB between tests
afterEach(async () => {
  const { db } = await import('../src/lib/db')
  await db.tastings.clear()
})
