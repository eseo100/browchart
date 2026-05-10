'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value?: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  clearLabel?: string
}

export default function SignaturePad({
  value,
  onChange,
  placeholder = '✍️ 여기에 서명해주세요',
  clearLabel = '다시 서명',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const [hasStrokes, setHasStrokes] = useState(false)

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
        setHasStrokes(true)
      }
      img.src = value
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    }
  }

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPosRef.current = getPos(e)
  }

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    ctx.strokeStyle = '#3D2E20'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
    if (!hasStrokes) setHasStrokes(true)
  }

  const handleUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPosRef.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative bg-white border-2 border-greige rounded-xl">
        <canvas
          ref={canvasRef}
          width={1000}
          height={300}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          className="w-full touch-none cursor-crosshair rounded-xl"
          style={{ aspectRatio: '10/3' }}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted text-sm font-light">{placeholder}</p>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-semibold text-muted hover:text-deepbrown underline"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  )
}
