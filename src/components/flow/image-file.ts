export function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

export function hasImageFilesInDataTransfer(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes('Files')
}

export function getImageFilesFromDataTransfer(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.files).filter(isImageFile)
}

export function readImageFileAsBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error('请选择图片文件'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('无法读取图片'))
        return
      }

      const commaIndex = result.indexOf(',')
      if (commaIndex === -1) {
        reject(new Error('无法解析图片数据'))
        return
      }

      resolve({
        base64: result.slice(commaIndex + 1),
        mimeType: file.type,
      })
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}
