'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string | null // base64 PNG
  onChange: (value: string | null) => void
}

const COLORS = [
  '#3D2E20', // deep brown
  '#6B4F3A', // warm brown
  '#E8A598', // soft pink
  '#C24A4A', // red
  '#1E40AF', // blue
  '#000000',
]

const SIZES = [2, 4, 6, 10]

export default function DrawingCanvas({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const [color, setColor] = useState('#3D2E20')
  const [size, setSize] = useState<number>(2)
  const [eraser, setEraser] = useState(false)

  // value 변경 시 canvas에 그리기 (초기 로드)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = value
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 한 번만 (그 후엔 사용자 그리기로만 변경)

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPosRef.current = getPos(e)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    const last = lastPosRef.current
    if (!last) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (eraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = size * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = size
    }
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPosRef.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
    // 변경 알림
    const canvas = canvasRef.current
    if (canvas) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      {/* 도구 모음 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c)
                setEraser(false)
              }}
              className={`w-6 h-6 rounded-full border-2 transition ${
                color === c && !eraser
                  ? 'border-deepbrown scale-110'
                  : 'border-greige'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`색상 ${c}`}
            />
          ))}
        </div>
        <div className="inline-flex bg-white border border-greige rounded-lg p-0.5 gap-0.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSize(s)
                setEraser(false)
              }}
              className={`w-7 h-7 rounded flex items-center justify-center transition ${
                size === s && !eraser ? 'bg-cream-light' : ''
              }`}
              aria-label={`굵기 ${s}`}
            >
              <span
                className="rounded-full bg-deepbrown"
                style={{ width: s + 2, height: s + 2 }}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEraser(!eraser)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
            eraser
              ? 'bg-warmbrown text-nude border-warmbrown'
              : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
          }`}
        >
          🧽 지우개
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-greige text-muted hover:text-deepbrown hover:bg-cream-light transition"
        >
          전체 지우기
        </button>
      </div>

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={700}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full bg-white border border-greige rounded-xl touch-none cursor-crosshair"
        style={{ aspectRatio: '12/7' }}
      />
      <p className="text-[11px] font-light text-muted">
        💡 iPad에서 Apple Pencil로 직접 그릴 수 있어요. 마우스/손가락도 OK.
      </p>
    </div>
  )
}
