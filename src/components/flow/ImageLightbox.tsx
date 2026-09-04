import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ImageLightboxProps = {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ src, alt = '图片预览', onClose }: ImageLightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    overlayRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      onCloseRef.current()
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [])

  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm outline-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片全屏预览"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg ring-2 ring-white/30 transition hover:scale-105 hover:bg-slate-100"
        aria-label="关闭"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <p className="pointer-events-none absolute top-6 right-20 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white/90">
        点击空白处或按 Esc 关闭
      </p>
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  )
}
