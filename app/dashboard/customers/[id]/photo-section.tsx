'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import CompareSlider from './compare-slider'

type Photo = {
  id: string
  storage_path: string
  kind: 'before' | 'after' | 'progress'
  notes: string | null
  taken_at: string
  signedUrl?: string
}

type Props = {
  customerId: string
  salonId: string
}

const KIND_LABEL: Record<string, string> = {
  before: '시술 전',
  after: '시술 후',
  progress: '진행 중',
}

const KIND_STYLE: Record<string, string> = {
  before: 'bg-greige text-deepbrown',
  after: 'bg-warmbrown text-nude',
  progress: 'bg-roselight text-deepbrown',
}

export default function PhotoSection({ customerId, salonId }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareBefore, setCompareBefore] = useState<Photo | null>(null)
  const [compareAfter, setCompareAfter] = useState<Photo | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('treatment_photos')
      .select('id, storage_path, kind, notes, taken_at')
      .eq('customer_id', customerId)
      .order('taken_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // signed URL 생성 (1시간 유효)
    const photosWithUrls = await Promise.all(
      (data ?? []).map(async (p) => {
        const { data: urlData } = await supabase.storage
          .from('treatment-photos')
          .createSignedUrl(p.storage_path, 3600)
        return { ...p, signedUrl: urlData?.signedUrl } as Photo
      })
    )

    setPhotos(photosWithUrls)
    setLoading(false)
  }, [customerId])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (
    file: File,
    kind: Photo['kind']
  ) => {
    if (!file) return
    setUploading(true)

    // 파일명 생성: {photoId}.{ext}
    const photoId = crypto.randomUUID()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${salonId}/${customerId}/${photoId}.${ext}`

    // Storage 업로드
    const { error: uploadError } = await supabase.storage
      .from('treatment-photos')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      alert('사진 업로드 실패: ' + uploadError.message)
      setUploading(false)
      return
    }

    // 메타데이터 insert
    const { error: insertError } = await supabase
      .from('treatment_photos')
      .insert({
        salon_id: salonId,
        customer_id: customerId,
        kind,
        storage_path: path,
      })

    if (insertError) {
      // Storage 정리
      await supabase.storage.from('treatment-photos').remove([path])
      alert('사진 등록 실패: ' + insertError.message)
      setUploading(false)
      return
    }

    setUploading(false)
    load()
  }

  const handleDelete = async (photo: Photo) => {
    if (!confirm('이 사진을 지울까요?')) return
    await supabase.storage
      .from('treatment-photos')
      .remove([photo.storage_path])
    await supabase.from('treatment_photos').delete().eq('id', photo.id)
    setSelectedIndex(null)
    load()
  }

  // 슬라이드 네비게이션 (전/후/순회)
  const goPrev = useCallback(() => {
    setSelectedIndex((idx) => {
      if (idx === null) return null
      return idx > 0 ? idx - 1 : photos.length - 1
    })
  }, [photos.length])

  const goNext = useCallback(() => {
    setSelectedIndex((idx) => {
      if (idx === null) return null
      return idx < photos.length - 1 ? idx + 1 : 0
    })
  }, [photos.length])

  // 키보드 좌우 / Esc
  useEffect(() => {
    if (selectedIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') setSelectedIndex(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIndex, goPrev, goNext])

  // 터치 스와이프
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = Math.abs(e.changedTouches[0].clientY - start.y)
    if (Math.abs(dx) > 50 && dy < 100) {
      if (dx > 0) goPrev()
      else goNext()
    }
    touchStartRef.current = null
  }

  const selectedPhoto =
    selectedIndex !== null ? photos[selectedIndex] : null

  // 종류별 그룹화
  const beforePhotos = photos.filter((p) => p.kind === 'before')
  const afterPhotos = photos.filter((p) => p.kind === 'after')
  const progressPhotos = photos.filter((p) => p.kind === 'progress')

  return (
    <section>
      <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-1">
        📷 시술 전/후 사진
        <span className="text-xs font-light text-muted ml-2">
          {photos.length}장
        </span>
      </h2>
      <p className="text-xs font-light text-muted mb-4">
        시술 전·후 사진을 올려서 기록하세요. (iPad에서는 카메라로 직접 촬영도 가능)
      </p>

      {/* 업로드 버튼들 */}
      <div className="bg-cream-light border border-greige rounded-2xl p-4 mb-4">
        <p className="text-xs font-medium text-deepbrown mb-3">
          📤 사진 추가
        </p>
        <div className="grid grid-cols-3 gap-2">
          <UploadButton
            label="시술 전"
            kind="before"
            onUpload={handleUpload}
            uploading={uploading}
            color="border-greige"
          />
          <UploadButton
            label="진행 중"
            kind="progress"
            onUpload={handleUpload}
            uploading={uploading}
            color="border-softpink"
          />
          <UploadButton
            label="시술 후"
            kind="after"
            onUpload={handleUpload}
            uploading={uploading}
            color="border-warmbrown"
          />
        </div>
      </div>

      {/* 전/후 비교 보기 진입 버튼 */}
      {photos.filter((p) => p.kind === 'before').length > 0 &&
        photos.filter((p) => p.kind === 'after').length > 0 && (
          <button
            type="button"
            onClick={() => {
              const before =
                photos.filter((p) => p.kind === 'before')[0] ?? null
              const after =
                photos.filter((p) => p.kind === 'after')[0] ?? null
              setCompareBefore(before)
              setCompareAfter(after)
              setCompareMode(true)
            }}
            className="w-full mb-4 py-3 rounded-2xl text-sm font-semibold bg-warmbrown text-nude hover:opacity-90 transition"
          >
            🔀 전/후 비교 보기
          </button>
        )}

      {loading && (
        <p className="text-sm font-light text-muted">사진 불러오는 중...</p>
      )}

      {!loading && photos.length === 0 && (
        <div className="bg-cream-light border border-dashed border-greige rounded-2xl p-8 text-center">
          <p className="text-3xl mb-2">📷</p>
          <p className="text-sm font-light text-muted">
            아직 등록된 사진이 없어요.
          </p>
        </div>
      )}

      {/* 갤러리 (종류별로 묶음) */}
      <div className="space-y-5">
        {beforePhotos.length > 0 && (
          <PhotoGroup
            label="시술 전"
            kindStyle={KIND_STYLE.before}
            photos={beforePhotos}
            onSelect={(p) =>
              setSelectedIndex(photos.findIndex((x) => x.id === p.id))
            }
          />
        )}
        {progressPhotos.length > 0 && (
          <PhotoGroup
            label="진행 중"
            kindStyle={KIND_STYLE.progress}
            photos={progressPhotos}
            onSelect={(p) =>
              setSelectedIndex(photos.findIndex((x) => x.id === p.id))
            }
          />
        )}
        {afterPhotos.length > 0 && (
          <PhotoGroup
            label="시술 후"
            kindStyle={KIND_STYLE.after}
            photos={afterPhotos}
            onSelect={(p) =>
              setSelectedIndex(photos.findIndex((x) => x.id === p.id))
            }
          />
        )}
      </div>

      {/* 전/후 비교 모달 */}
      {compareMode && (
        <div
          className="fixed inset-0 bg-deepbrown/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setCompareMode(false)}
        >
          <div
            className="max-w-4xl w-full my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 text-nude">
              <h3 className="font-display font-bold text-lg tracking-tight">
                🔀 전/후 비교
              </h3>
              <button
                onClick={() => setCompareMode(false)}
                className="text-nude/80 hover:text-nude text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* 비교 슬라이더 */}
            {compareBefore?.signedUrl && compareAfter?.signedUrl ? (
              <CompareSlider
                key={`${compareBefore.id}-${compareAfter.id}`}
                beforeUrl={compareBefore.signedUrl}
                afterUrl={compareAfter.signedUrl}
              />
            ) : (
              <div className="bg-deepbrown/50 rounded-2xl p-10 text-center text-nude">
                <p>전/후 사진을 모두 선택해주세요.</p>
              </div>
            )}

            {/* 사진 선택 (썸네일) */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-nude/80 mb-2">
                  시술 전 선택
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {photos
                    .filter((p) => p.kind === 'before')
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCompareBefore(p)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                          compareBefore?.id === p.id
                            ? 'border-nude'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {p.signedUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.signedUrl}
                            alt="시술 전"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-nude/80 mb-2">
                  시술 후 선택
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {photos
                    .filter((p) => p.kind === 'after')
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCompareAfter(p)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                          compareAfter?.id === p.id
                            ? 'border-nude'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {p.signedUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.signedUrl}
                            alt="시술 후"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>
            <p className="text-[11px] font-light text-nude/70 mt-3 text-center">
              슬라이더를 좌우로 끌어서 비교하세요
            </p>
          </div>
        </div>
      )}

      {/* 사진 큰 보기 + 슬라이드 모달 */}
      {selectedPhoto && selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-deepbrown/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedIndex(null)}
        >
          {/* 좌측 화살표 */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-nude/20 hover:bg-nude/40 backdrop-blur text-nude flex items-center justify-center text-2xl font-bold transition"
              aria-label="이전 사진"
            >
              ‹
            </button>
          )}

          {/* 우측 화살표 */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-nude/20 hover:bg-nude/40 backdrop-blur text-nude flex items-center justify-center text-2xl font-bold transition"
              aria-label="다음 사진"
            >
              ›
            </button>
          )}

          <div
            className="max-w-3xl w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center justify-between mb-3 text-nude">
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${KIND_STYLE[selectedPhoto.kind]}`}
                >
                  {KIND_LABEL[selectedPhoto.kind]}
                </span>
                <span className="font-display text-sm text-nude/80">
                  {selectedIndex + 1} / {photos.length}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(selectedPhoto)}
                  className="text-xs font-semibold text-nude/80 hover:text-nude underline"
                >
                  삭제
                </button>
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="text-nude/80 hover:text-nude text-xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
            {selectedPhoto.signedUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedPhoto.signedUrl}
                alt={KIND_LABEL[selectedPhoto.kind]}
                className="w-full max-h-[75vh] object-contain rounded-xl bg-deepbrown select-none"
                draggable={false}
              />
            )}
            <p className="text-xs font-light text-nude/70 mt-2 text-center">
              {new Date(selectedPhoto.taken_at).toLocaleString('ko-KR')}
              {photos.length > 1 && (
                <span className="ml-3 text-nude/50">
                  ← → 또는 좌우로 스와이프
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

/* ─────────── 업로드 버튼 ─────────── */
function UploadButton({
  label,
  kind,
  onUpload,
  uploading,
  color,
}: {
  label: string
  kind: Photo['kind']
  onUpload: (file: File, kind: Photo['kind']) => void
  uploading: boolean
  color: string
}) {
  return (
    <label
      className={`relative flex flex-col items-center justify-center py-3 bg-white border-2 ${color} rounded-xl cursor-pointer hover:bg-nude transition ${
        uploading ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <span className="text-xl mb-0.5">📷</span>
      <span className="text-xs font-semibold text-deepbrown">{label}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            onUpload(file, kind)
            e.target.value = ''
          }
        }}
        disabled={uploading}
      />
    </label>
  )
}

/* ─────────── 사진 그룹 (종류별 그리드) ─────────── */
function PhotoGroup({
  label,
  kindStyle,
  photos,
  onSelect,
}: {
  label: string
  kindStyle: string
  photos: Photo[]
  onSelect: (p: Photo) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${kindStyle}`}>
          {label}
        </span>
        <span className="text-xs font-light text-muted">{photos.length}장</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className="aspect-square bg-cream-light border border-greige rounded-xl overflow-hidden hover:border-warmbrown transition"
          >
            {p.signedUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={p.signedUrl}
                alt={KIND_LABEL[p.kind]}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                불러오는 중...
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
