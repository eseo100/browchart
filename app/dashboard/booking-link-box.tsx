'use client'

import { useEffect, useState } from 'react'

type Props = {
  slug: string
  /** 'compact' = 한 줄, 'card' = 박스 */
  variant?: 'compact' | 'card'
}

export default function BookingLinkBox({ slug, variant = 'card' }: Props) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const fullUrl = origin ? `${origin}/booking/${slug}` : `/booking/${slug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('복사 실패. 직접 선택해서 복사해주세요.')
    }
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted font-light">예약링크</span>
        <span className="font-display text-deepbrown truncate">
          {fullUrl}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 px-2 py-1 text-[11px] font-semibold rounded-md border border-greige text-deepbrown hover:bg-cream-light transition"
          aria-label="링크 복사"
        >
          {copied ? '✓ 복사됨' : '📋 복사'}
        </button>
      </div>
    )
  }

  // QR 코드 이미지 URL (api.qrserver.com — 가입/키 불필요)
  const qrSize = 320
  const qrUrl = origin
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=10&data=${encodeURIComponent(fullUrl)}`
    : ''

  return (
    <div className="space-y-3">
      <div className="bg-white border border-greige rounded-xl p-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">
            손님 예약 링크
          </p>
          <p className="font-display text-sm text-deepbrown truncate">
            {fullUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
        >
          {copied ? '✓ 복사됨' : '📋 복사'}
        </button>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-warmbrown text-nude hover:opacity-90 transition"
        >
          열기 ↗
        </a>
      </div>

      {/* QR 코드 */}
      {qrUrl && (
        <div className="bg-white border border-greige rounded-xl p-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="예약 링크 QR 코드"
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
              QR 코드
            </p>
            <p className="text-xs font-light text-deepbrown leading-relaxed mb-3">
              매장 명함·인스타에 인쇄해두면 손님이 폰으로 찍어서 바로 예약할 수 있어요.
            </p>
            <div className="flex gap-2">
              <a
                href={qrUrl}
                download={`browchart-qr-${slug}.png`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
              >
                ⬇ 다운로드
              </a>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
              >
                🔍 크게 보기
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
