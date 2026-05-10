'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  getTemplateForCategory,
  type ConsentTemplate,
} from '@/lib/consent-templates'
import SignaturePad from './signature-pad'

type Booking = {
  id: string
  salon_id: string
  customer_name: string
  customer_phone: string
  menu: { name: string; category: string } | null
}

type ExistingConsent = {
  id: string
  signed_at: string
  signed_name: string
  signature: string
}

export default function ConsentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [template, setTemplate] = useState<ConsentTemplate | null>(null)
  const [existing, setExisting] = useState<ExistingConsent | null>(null)
  const [staffPin, setStaffPin] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 폼 상태
  const [signedName, setSignedName] = useState('')
  const [agreed, setAgreed] = useState<Record<number, boolean>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // PIN 모달
  const [pinOpen, setPinOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select(
          `id, salon_id, customer_name, customer_phone,
           menu:menus(name, category)`
        )
        .eq('id', id)
        .maybeSingle()

      if (!bookingData) {
        setLoading(false)
        return
      }
      const b = bookingData as unknown as Booking
      setBooking(b)
      setSignedName(b.customer_name)

      const tpl = getTemplateForCategory(b.menu?.category ?? 'eyebrow')
      setTemplate(tpl)

      // 기존 동의서 + 매장 PIN 조회
      const [{ data: consentData }, { data: salonData }] = await Promise.all([
        supabase
          .from('consents')
          .select('id, signed_at, signed_name, signature')
          .eq('booking_id', b.id)
          .order('signed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('salons')
          .select('staff_pin')
          .eq('id', b.salon_id)
          .maybeSingle(),
      ])

      setExisting((consentData as ExistingConsent) ?? null)
      setStaffPin((salonData?.staff_pin as string | null) ?? null)
      setLoading(false)
    }
    load()
  }, [id])

  const allRequiredAgreed =
    template?.agreements.every((_, i) => agreed[i]) ?? false

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!allRequiredAgreed) {
      setError('모든 동의 항목에 체크해주세요.')
      return
    }
    if (!signature) {
      setError('서명을 해주세요.')
      return
    }
    if (!signedName.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    if (!staffPin) {
      alert('매장 PIN이 설정되지 않았어요. 설정 페이지에서 PIN을 먼저 설정해주세요.')
      return
    }
    setPinOpen(true)
  }

  const handleConfirmAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput !== staffPin) {
      setPinError(true)
      setPinInput('')
      setTimeout(() => setPinError(false), 600)
      return
    }
    if (!booking || !template || !signature) return

    setSubmitting(true)

    // customer_id 찾기
    const { data: customerData } = await supabase
      .from('customers')
      .select('id')
      .eq('salon_id', booking.salon_id)
      .eq('phone', booking.customer_phone)
      .maybeSingle()

    const { error: insertError } = await supabase.from('consents').insert({
      salon_id: booking.salon_id,
      booking_id: booking.id,
      customer_id: customerData?.id ?? null,
      template_key: template.key,
      title: template.title,
      body: { sections: template.sections, agreements: template.agreements },
      agreements: template.agreements.map((text, i) => ({
        text,
        checked: !!agreed[i],
      })),
      signature,
      signed_name: signedName.trim(),
    })

    setSubmitting(false)
    if (insertError) {
      setError('저장 실패: ' + insertError.message)
      setPinOpen(false)
      return
    }
    // 성공 → 예약 관리로 돌아감
    router.push('/dashboard/bookings')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light text-muted">불러오는 중...</p>
      </div>
    )
  }

  if (!booking || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-bold text-deepbrown mb-3">예약을 찾을 수 없어요</p>
          <Link
            href="/dashboard/bookings"
            className="text-sm font-semibold text-deepbrown underline"
          >
            예약 관리로
          </Link>
        </div>
      </div>
    )
  }

  // 이미 작성된 동의서 보기 모드
  if (existing) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-greige bg-cream-light">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link
              href="/dashboard/bookings"
              className="text-sm font-medium text-muted hover:text-deepbrown"
            >
              ← 예약 관리
            </Link>
            <span className="font-display font-bold text-lg tracking-tight text-deepbrown">
              동의서 (작성됨)
            </span>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-5">
          <div className="bg-cream-light border border-greige rounded-2xl p-5">
            <p className="text-xs font-light text-muted">동의서 제목</p>
            <p className="font-bold text-deepbrown tracking-tight mb-3">
              {template.title}
            </p>
            <p className="text-xs font-light text-muted">서명자</p>
            <p className="font-medium text-deepbrown mb-3">
              {existing.signed_name}
            </p>
            <p className="text-xs font-light text-muted">작성일시</p>
            <p className="font-medium text-deepbrown mb-3">
              {new Date(existing.signed_at).toLocaleString('ko-KR')}
            </p>
            <p className="text-xs font-light text-muted mb-1.5">서명</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existing.signature}
              alt="서명"
              className="bg-white border border-greige rounded-lg w-full max-w-md"
            />
          </div>
          <p className="text-xs font-light text-muted text-center">
            * 이미 동의서가 작성된 예약이에요. 다시 작성해야 한다면 기존 항목을
            삭제 후 시도해주세요.
          </p>
        </main>
      </div>
    )
  }

  // 작성 모드
  return (
    <div className="min-h-screen pb-32">
      <header className="border-b border-greige bg-cream-light sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard/bookings"
            className="text-sm font-medium text-muted hover:text-deepbrown"
          >
            ← 예약 관리
          </Link>
          <span className="font-display font-bold text-lg tracking-tight text-deepbrown">
            동의서 작성
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* 손님 정보 헤더 */}
        <section className="bg-roselight/40 border border-softpink/40 rounded-2xl p-5 mb-6">
          <p className="text-xs font-light text-muted mb-1">
            {booking.customer_name}님 · {booking.menu?.name ?? '메뉴'}
          </p>
          <h1 className="font-display font-bold text-2xl tracking-tight text-deepbrown">
            {template.title}
          </h1>
          <p className="text-xs font-light text-muted mt-2">
            아래 내용을 잘 읽어보시고 동의 항목 모두 체크 후 서명해주세요.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 본문 섹션 */}
          {template.sections.map((sec, i) => (
            <section
              key={i}
              className="bg-cream-light border border-greige rounded-2xl p-5"
            >
              <h2 className="font-bold text-deepbrown tracking-tight mb-2">
                {i + 1}. {sec.title}
              </h2>
              <ul className="space-y-1.5">
                {sec.bullets.map((b, j) => (
                  <li
                    key={j}
                    className="text-sm font-light text-deepbrown leading-relaxed flex gap-2"
                  >
                    <span className="text-muted">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* 동의 체크박스 */}
          <section className="bg-cream-light border border-greige rounded-2xl p-5">
            <h2 className="font-bold text-deepbrown tracking-tight mb-3">
              동의 사항
            </h2>
            <div className="space-y-3">
              {template.agreements.map((a, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!agreed[i]}
                    onChange={(e) =>
                      setAgreed((prev) => ({ ...prev, [i]: e.target.checked }))
                    }
                    className="mt-1 w-5 h-5 accent-warmbrown shrink-0"
                  />
                  <span className="text-sm text-deepbrown leading-relaxed">
                    {a}
                  </span>
                </label>
              ))}
            </div>
            {!allRequiredAgreed && (
              <p className="text-[11px] font-light text-muted mt-3">
                모든 항목에 체크하셔야 서명할 수 있어요.
              </p>
            )}
          </section>

          {/* 서명 */}
          <section className="bg-cream-light border border-greige rounded-2xl p-5">
            <h2 className="font-bold text-deepbrown tracking-tight mb-3">
              ✍️ 서명
            </h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                이름 (자동 입력 — 필요시 수정)
              </label>
              <input
                type="text"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
              />
            </div>
            <SignaturePad onChange={setSignature} />
          </section>

          {error && (
            <p className="text-sm font-medium text-softpink text-center">
              {error}
            </p>
          )}

          {/* 제출 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-4 rounded-2xl text-base font-semibold disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '✓ 동의 및 서명 완료 (직원 PIN 필요)'}
          </button>
        </form>
      </main>

      {/* PIN 모달 */}
      {pinOpen && (
        <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <form
            onSubmit={handleConfirmAndSave}
            className="bg-nude rounded-3xl p-7 w-full max-w-sm space-y-4"
          >
            <div className="text-center">
              <p className="text-3xl mb-2">🔒</p>
              <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
                직원 PIN 입력
              </h3>
              <p className="text-xs font-light text-muted mt-1">
                서명 완료 처리하려면 직원 확인이 필요해요.
              </p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className={`w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-display font-bold bg-white border-2 rounded-xl focus:outline-none ${
                pinError
                  ? 'border-softpink animate-pulse'
                  : 'border-greige focus:border-warmbrown'
              }`}
            />
            {pinError && (
              <p className="text-xs font-medium text-softpink text-center">
                PIN이 일치하지 않아요
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPinOpen(false)
                  setPinInput('')
                  setPinError(false)
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? '저장 중...' : '확정'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
