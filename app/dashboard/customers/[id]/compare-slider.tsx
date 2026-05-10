'use client'

import { useRef, useState } from 'react'

type Props = {
  beforeUrl: string
  afterUrl: string
}

export default function CompareSlider({ beforeUrl, afterUrl }: Props) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const updatePos = (clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, pct)))
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePos(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    e.preventDefault()
    updatePos(e.clientX)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full bg-deepbrown rounded-2xl overflow-hidden touch-none select-none cursor-ew-resize"
      style={{ aspectRatio: '4/3' }}
    >
      {/* 전 (배경) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt="시술 전"
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
      {/* 후 (오버레이, 위치까지만 보임) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt="시술 후"
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* 라벨 */}
      <span className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-greige text-deepbrown">
        시술 전
      </span>
      <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warmbrown text-nude">
        시술 후
      </span>

      {/* 슬라이더 핸들 */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-nude pointer-events-none"
        style={{ left: `${position}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-nude shadow-lg flex items-center justify-center pointer-events-none"
        style={{ left: `calc(${position}% - 20px)` }}
      >
        <span className="text-deepbrown text-sm font-bold">⇆</span>
      </div>
    </div>
  )
}
