const DB_NAME = 'miniflow-images'
const STORE_NAME = 'images'
const DB_VERSION = 1

export type StoredFlowImage = {
  base64: string
  mimeType: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function saveFlowImage(
  key: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('保存图片失败'))
    }
    tx.objectStore(STORE_NAME).put({ base64, mimeType }, key)
  })
}

export async function getFlowImage(key: string): Promise<StoredFlowImage | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => {
      db.close()
      const value = request.result as StoredFlowImage | undefined
      resolve(value ?? null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error ?? new Error('读取图片失败'))
    }
  })
}

export async function deleteFlowImage(key: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('删除图片失败'))
    }
    tx.objectStore(STORE_NAME).delete(key)
  })
}

export async function duplicateFlowImage(
  sourceKey: string,
  targetKey: string,
): Promise<void> {
  const image = await getFlowImage(sourceKey)
  if (!image) return
  await saveFlowImage(targetKey, image.base64, image.mimeType)
}
