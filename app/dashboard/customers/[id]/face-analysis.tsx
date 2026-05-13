'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const GRID_OPTIONS = [
  { key: 'sparse', label: '성김', cols: 10 },
  { key: 'normal', label: '보통', cols: 20 },
  { key: 'dense', label: '촘촘', cols: 32 },
] as const

type GridKey = (typeof GRID_OPTIONS)[number]['key']

// 반영구 메이크업용으로 조정된 얼굴 분석 항목
const FEATURE_GROUPS: readonly {
  key: string
  options: readonly string[]
  multiple?: boolean
  cols?: number
}[] = [
  {
    key: '얼굴형',
    options: ['계란형', '둥근형', '사각형', '긴형', '장방형', '역삼각형', '하트형'],
    cols: 4,
  },
  {
    key: '비율',
    options: ['상안부 발달', '중안부 발달', '하안부 발달', '균형'],
  },
  {
    key: '이목구비 배치',
    options: ['중심에 모임', '벌어짐', '균형', '위쪽 쏠림', '아래쪽 쏠림'],
  },
  {
    key: '헤어라인',
    options: ['좁음', '세로 넓음', '가로 넓음', 'M자'],
  },
  {
    key: '눈옆 여백',
    options: ['좁음', '보통', '넓음'],
  },
  {
    key: '광대',
    options: ['옆광대', '앞광대', '보통', '없음'],
  },
  {
    key: '턱골격',
    options: ['각진', '둥근', '뾰족', '발달', '긴'],
  },
  {
    key: '눈썹 현재 상태',
    options: ['없음', '숱 적음', '정상', '숱 많음'],
  },
  {
    key: '입술 현재 상태',
    options: ['얇음', '보통', '두꺼움', '비대칭'],
  },
  {
    key: '피부톤',
    options: ['쿨톤', '웜톤', '뉴트럴'],
  },
]

function GridOverlay({ density }: { density: GridKey }) {
  const cols = GRID_OPTIONS.find((g) => g.key === density)!.cols
  const rows = Math.round(cols * 1.5)
  const elements: React.ReactNode[] = []

  for (let i = 1; i < cols; i++) {
    const x = (i / cols) * 100
    const major = i % 5 === 0
    elements.push(
      <line
        key={`v${i}`}
        x1={`${x}%`}
        y1="0"
        x2={`${x}%`}
        y2="100%"
        stroke={major ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)'}
        strokeWidth={major ? 1 : 0.4}
      />
    )
  }
  for (let i = 1; i < rows; i++) {
    const y = (i / rows) * 100
    const major = i % 5 === 0
    elements.push(
      <line
        key={`h${i}`}
        x1="0"
        y1={`${y}%`}
        x2="100%"
        y2={`${y}%`}
        stroke={major ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)'}
        strokeWidth={major ? 1 : 0.4}
      />
    )
  }

  // 빨간 중심선
  elements.push(
    <line key="cv" x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,30,30,0.85)" strokeWidth={1.8} />
  )
  elements.push(
    <line key="ch" x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,30,30,0.85)" strokeWidth={1.8} />
  )

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      {elements}
    </svg>
  )
}

type Tool = 'pen' | 'eraser'

function DrawingCanvas({
  value,
  onChange,
  enabled,
  color,
  tool,
  eraserSize,
  zoom,
}: {
  value: string | null
  onChange: (v: string | null) => void
  enabled: boolean
  color: string
  tool: Tool
  eraserSize: number
  zoom: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const activePointerRef = useRef<number | null>(null)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const colorRef = useRef(color)
  const toolRef = useRef(tool)
  const eraserSizeRef = useRef(eraserSize)
  colorRef.current = color
  toolRef.current = tool
  eraserSizeRef.current = eraserSize

  useEffect(() => {
    let attempts = 0
    let cancelled = false
    const setup = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        if (attempts++ < 30) setTimeout(setup, 50)
        return
      }
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (value) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
        img.src = value
      }
    }
    setup()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  const applyTool = () => {
    const ctx = canvasRef.current!.getContext('2d')!
    if (toolRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = eraserSizeRef.current
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = colorRef.current
      ctx.lineWidth = 2.5
    }
  }

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const handleDown = (e: React.PointerEvent) => {
    if (drawingRef.current) return
    e.preventDefault()
    e.stopPropagation()
    drawingRef.current = true
    activePointerRef.current = e.pointerId
    lastRef.current = getPos(e)
    applyTool()
    if (e.pointerType === 'pen') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
  }
  const handleMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !lastRef.current) return
    if (activePointerRef.current !== e.pointerId) return
    e.preventDefault()
    e.stopPropagation()
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastRef.current = pos
  }
  const handleUp = (e: React.PointerEvent) => {
    if (activePointerRef.current !== e.pointerId) return
    if (!drawingRef.current) return
    e.stopPropagation()
    drawingRef.current = false
    activePointerRef.current = null
    lastRef.current = null
    onChange(canvasRef.current!.toDataURL('image/png'))
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        touchAction: enabled ? 'none' : 'auto',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      className={`absolute inset-0 w-full h-full ${
        enabled ? 'outline outline-2 outline-warmbrown' : 'pointer-events-none'
      }`}
      onPointerDown={enabled ? handleDown : undefined}
      onPointerMove={enabled ? handleMove : undefined}
      onPointerUp={enabled ? handleUp : undefined}
      onPointerCancel={enabled ? handleUp : undefined}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}

function CameraCapture({
  density,
  onCapture,
  onCancel,
}: {
  density: GridKey
  onCapture: (dataUrl: string) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    const start = async () => {
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        try {
          await video.play()
        } catch {
          /* ignore */
        }
      } catch (e) {
        setError('카메라 접근 실패: ' + (e as Error).message)
      }
    }
    start()
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    onCapture(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="fixed inset-0 bg-deepbrown z-50 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-nude text-sm p-4 text-center">
            {error}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <GridOverlay density={density} />
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="bg-deepbrown p-4 flex items-center justify-between">
        <button onClick={onCancel} className="text-nude text-sm px-3">
          취소
        </button>
        <button
          onClick={capture}
          disabled={!!error}
          className="bg-nude rounded-full w-16 h-16 disabled:opacity-50"
          aria-label="촬영"
        />
        <div className="w-12" />
      </div>
    </div>
  )
}

async function fileToResizedDataUrl(file: File, maxSize = 1000): Promise<string> {
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = img.width * scale
      const h = img.height * scale
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}

type Props = {
  customerId: string
  salonId: string
}

export default function FaceAnalysis({ customerId, salonId }: Props) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [drawing, setDrawing] = useState<string | null>(null)
  const [features, setFeatures] = useState<Record<string, string | string[]>>({})
  const [notes, setNotes] = useState('')
  const [density, setDensity] = useState<GridKey>('normal')
  const [showGrid, setShowGrid] = useState(true)
  const [drawEnabled, setDrawEnabled] = useState(false)
  const [color, setColor] = useState<string>('#6B4F3A')
  const [tool, setTool] = useState<Tool>('pen')
  const [eraserSize, setEraserSize] = useState<number>(20)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('face_analyses')
        .select('photo_url, drawing_url, features, notes')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
      const row = data?.[0]
      if (row) {
        setPhoto(row.photo_url)
        setDrawing(row.drawing_url)
        setFeatures(row.features ?? {})
        setNotes(row.notes ?? '')
      }
      setLoading(false)
    }
    load()
  }, [customerId])

  const handlePhotoFile = async (file: File) => {
    const dataUrl = await fileToResizedDataUrl(file)
    setPhoto(dataUrl)
    setDrawing(null)
    setResetKey((k) => k + 1)
  }

  const handleCameraCapture = async (dataUrl: string) => {
    const resized = await new Promise<string>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const maxSize = 1000
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = img.width * scale
        const h = img.height * scale
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = dataUrl
    })
    setPhoto(resized)
    setDrawing(null)
    setResetKey((k) => k + 1)
    setCameraOpen(false)
  }

  const handleClearDrawing = () => {
    setDrawing(null)
    setResetKey((k) => k + 1)
  }

  const handleDeletePhoto = () => {
    if (!confirm('얼굴 사진을 삭제할까요?')) return
    setPhoto(null)
    setDrawing(null)
    setResetKey((k) => k + 1)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: existing } = await supabase
      .from('face_analyses')
      .select('id')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
    const payload = {
      photo_url: photo,
      drawing_url: drawing,
      features,
      notes: notes.trim() || null,
    }
    const r = existing?.[0]
      ? await supabase
          .from('face_analyses')
          .update(payload)
          .eq('id', existing[0].id)
      : await supabase
          .from('face_analyses')
          .insert({ customer_id: customerId, salon_id: salonId, ...payload })
    setSaving(false)
    if (r.error) {
      alert('저장 실패: ' + r.error.message)
    } else {
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 1500)
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted text-center py-6">
        얼굴 분석 불러오는 중...
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* 사진 영역 */}
      {!photo ? (
        <div className="border-2 border-dashed border-greige rounded-2xl py-10 px-4 text-center bg-white/40">
          <p className="text-3xl mb-2">😊</p>
          <p className="text-sm text-muted mb-4">
            얼굴 사진을 추가하면 분석할 수 있어요
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
            >
              📸 카메라로 찍기
            </button>
            <label className="px-4 py-2 rounded-lg border border-greige text-deepbrown text-xs font-semibold cursor-pointer hover:bg-cream-light transition">
              🖼 갤러리에서 선택
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePhotoFile(f)
                }}
              />
            </label>
          </div>
        </div>
      ) : (
        <>
          <div className="relative select-none mx-auto max-w-[80%] overflow-hidden rounded-xl">
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                touchAction: drawEnabled ? 'auto' : 'none',
              }}
              className="relative"
              onPointerDown={
                drawEnabled
                  ? undefined
                  : (e) => {
                      pointersRef.current.set(e.pointerId, {
                        x: e.clientX,
                        y: e.clientY,
                      })
                      try {
                        ;(e.currentTarget as HTMLElement).setPointerCapture(
                          e.pointerId
                        )
                      } catch {
                        /* ignore */
                      }
                      if (pointersRef.current.size === 2) {
                        const [a, b] = Array.from(pointersRef.current.values())
                        const dx = a.x - b.x
                        const dy = a.y - b.y
                        pinchRef.current = {
                          distance: Math.hypot(dx, dy),
                          zoom,
                        }
                        dragRef.current = null
                      } else if (pointersRef.current.size === 1) {
                        dragRef.current = {
                          x: e.clientX,
                          y: e.clientY,
                          panX: pan.x,
                          panY: pan.y,
                        }
                      }
                    }
              }
              onPointerMove={
                drawEnabled
                  ? undefined
                  : (e) => {
                      if (!pointersRef.current.has(e.pointerId)) return
                      pointersRef.current.set(e.pointerId, {
                        x: e.clientX,
                        y: e.clientY,
                      })
                      if (
                        pointersRef.current.size >= 2 &&
                        pinchRef.current
                      ) {
                        const [a, b] = Array.from(pointersRef.current.values())
                        const dx = a.x - b.x
                        const dy = a.y - b.y
                        const distance = Math.hypot(dx, dy)
                        const ratio = distance / pinchRef.current.distance
                        setZoom(
                          Math.min(
                            Math.max(pinchRef.current.zoom * ratio, 0.5),
                            4
                          )
                        )
                      } else if (
                        pointersRef.current.size === 1 &&
                        dragRef.current
                      ) {
                        setPan({
                          x:
                            dragRef.current.panX +
                            (e.clientX - dragRef.current.x),
                          y:
                            dragRef.current.panY +
                            (e.clientY - dragRef.current.y),
                        })
                      }
                    }
              }
              onPointerUp={
                drawEnabled
                  ? undefined
                  : (e) => {
                      pointersRef.current.delete(e.pointerId)
                      if (pointersRef.current.size < 2)
                        pinchRef.current = null
                      if (pointersRef.current.size === 0)
                        dragRef.current = null
                      else if (pointersRef.current.size === 1) {
                        const [first] = Array.from(pointersRef.current.values())
                        dragRef.current = {
                          x: first.x,
                          y: first.y,
                          panX: pan.x,
                          panY: pan.y,
                        }
                      }
                    }
              }
              onPointerCancel={
                drawEnabled
                  ? undefined
                  : (e) => {
                      pointersRef.current.delete(e.pointerId)
                      if (pointersRef.current.size < 2) pinchRef.current = null
                      if (pointersRef.current.size === 0)
                        dragRef.current = null
                    }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="얼굴 사진"
                className="w-full block"
                draggable={false}
              />
              <DrawingCanvas
                key={`${photo.length}-${resetKey}`}
                value={drawing}
                onChange={setDrawing}
                enabled={drawEnabled}
                color={color}
                tool={tool}
                eraserSize={eraserSize}
                zoom={zoom}
              />
            </div>
            {showGrid && <GridOverlay density={density} />}

            {/* 도구 패널 */}
            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur rounded-lg p-1.5 flex flex-col gap-1 shadow z-10">
              <button
                type="button"
                onClick={() => setDrawEnabled((v) => !v)}
                className={`text-[10px] px-2 py-1 rounded font-semibold ${
                  drawEnabled
                    ? 'bg-warmbrown text-nude'
                    : 'bg-cream-light text-deepbrown'
                }`}
              >
                {drawEnabled ? '✏️ 그리기 ON' : '✏️ 그리기 OFF'}
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="text-[10px] px-2 py-1 rounded bg-cream-light text-deepbrown w-7"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                  className="text-[10px] px-2 py-1 rounded bg-cream-light text-deepbrown w-7"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                  }}
                  className="text-[10px] px-2 py-1 rounded bg-cream-light text-deepbrown"
                >
                  리셋
                </button>
              </div>
              {drawEnabled && (
                <>
                  <div className="flex gap-1">
                    {[
                      { c: '#ffffff', label: 'W' },
                      { c: '#ef4444', label: 'R' },
                      { c: '#1d4ed8', label: 'B' },
                      { c: '#6B4F3A', label: 'Br' },
                      { c: '#111111', label: 'K' },
                    ].map((c) => (
                      <button
                        key={c.c}
                        type="button"
                        onClick={() => {
                          setColor(c.c)
                          setTool('pen')
                        }}
                        aria-label={c.label}
                        className={`w-5 h-5 rounded-full border-2 ${
                          tool === 'pen' && color === c.c
                            ? 'border-deepbrown'
                            : 'border-greige'
                        }`}
                        style={{ backgroundColor: c.c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTool('eraser')}
                    className={`text-[10px] px-2 py-1 rounded font-semibold ${
                      tool === 'eraser'
                        ? 'bg-deepbrown text-nude'
                        : 'bg-cream-light text-deepbrown'
                    }`}
                  >
                    🧽 지우개
                  </button>
                  {tool === 'eraser' && (
                    <div className="flex gap-1">
                      {[
                        { v: 10, label: 'S' },
                        { v: 20, label: 'M' },
                        { v: 40, label: 'L' },
                        { v: 80, label: 'XL' },
                      ].map((s) => (
                        <button
                          key={s.v}
                          type="button"
                          onClick={() => setEraserSize(s.v)}
                          className={`text-[10px] px-2 py-1 rounded ${
                            eraserSize === s.v
                              ? 'bg-deepbrown text-nude'
                              : 'bg-cream-light text-deepbrown'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 격자 설정 */}
          <div className="flex flex-wrap gap-2 items-center text-xs justify-center">
            <span className="text-muted">격자:</span>
            {GRID_OPTIONS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setDensity(g.key)}
                className={`px-3 py-1 rounded-lg border font-semibold transition ${
                  density === g.key
                    ? 'bg-warmbrown text-nude border-warmbrown'
                    : 'bg-white text-deepbrown border-greige'
                }`}
              >
                {g.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowGrid((v) => !v)}
              className={`px-3 py-1 rounded-lg border font-semibold transition ${
                showGrid
                  ? 'bg-white text-deepbrown border-greige'
                  : 'bg-greige text-muted border-greige'
              }`}
            >
              {showGrid ? '격자 끄기' : '격자 켜기'}
            </button>
          </div>

          {/* 사진 액션 */}
          <div className="flex gap-2 text-xs justify-center flex-wrap">
            <button
              type="button"
              onClick={handleClearDrawing}
              className="px-3 py-1.5 rounded-lg border border-greige text-deepbrown font-semibold hover:bg-nude transition"
            >
              분석선 지우기
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-greige text-deepbrown font-semibold hover:bg-nude transition"
            >
              📸 다시 찍기
            </button>
            <label className="px-3 py-1.5 rounded-lg border border-greige text-deepbrown font-semibold cursor-pointer hover:bg-nude transition">
              🖼 갤러리
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePhotoFile(f)
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleDeletePhoto}
              className="px-3 py-1.5 rounded-lg border border-greige text-softpink font-semibold hover:bg-roselight/40 transition"
            >
              사진 삭제
            </button>
          </div>
        </>
      )}

      {/* 얼굴 분석 항목 */}
      <div className="space-y-4 pt-4 border-t border-greige">
        <h3 className="text-base font-bold text-deepbrown text-center">
          얼굴 분석
        </h3>
        {FEATURE_GROUPS.map((group) => (
          <div key={group.key}>
            <label className="text-xs font-semibold text-deepbrown block mb-2">
              {group.key}
              {group.multiple && (
                <span className="text-muted ml-1 font-light">(복수 선택)</span>
              )}
            </label>
            <div
              className={`gap-1.5 ${
                group.cols === 4
                  ? 'grid grid-cols-3 sm:grid-cols-4'
                  : 'flex flex-wrap'
              }`}
            >
              {group.options.map((opt) => {
                const value = features[group.key]
                const selected = group.multiple
                  ? Array.isArray(value) && value.includes(opt)
                  : value === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setFeatures((prev) => {
                        const next = { ...prev }
                        if (group.multiple) {
                          const arr = Array.isArray(prev[group.key])
                            ? (prev[group.key] as string[])
                            : []
                          if (selected) {
                            const removed = arr.filter((v) => v !== opt)
                            if (removed.length === 0) delete next[group.key]
                            else next[group.key] = removed
                          } else {
                            next[group.key] = [...arr, opt]
                          }
                        } else {
                          if (selected) delete next[group.key]
                          else next[group.key] = opt
                        }
                        return next
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      selected
                        ? 'bg-warmbrown text-nude border-warmbrown'
                        : 'bg-white text-deepbrown border-greige hover:bg-nude'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* 분석 메모 */}
        <div>
          <label className="text-xs font-semibold text-deepbrown block mb-2">
            분석 메모 (선택)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="얼굴형 분석 결과나 시술 시 고려사항을 자유롭게 적어주세요."
            className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '얼굴 분석 저장'}
          </button>
          {savedToast && (
            <span className="text-xs font-medium text-warmbrown">
              ✓ 저장됨
            </span>
          )}
        </div>
      </div>

      {cameraOpen && (
        <CameraCapture
          density={density}
          onCapture={handleCameraCapture}
          onCancel={() => setCameraOpen(false)}
        />
      )}
    </div>
  )
}
