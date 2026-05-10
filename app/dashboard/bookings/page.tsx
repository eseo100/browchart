'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Booking = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  consultation: { experience?: string; memo?: string | null } | null
  desired_date: string | null
  desired_time: string | null
  customer_memo: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  deposit_amount: number
  deposit_status: 'unpaid' | 'paid' | 'refunded' | 'waived'
  created_at: string
  menu: { name: string; price: number; duration_minutes: number } | null
  consents: { id: string }[] | null
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

const STATUS_LABEL: Record<Booking['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
  no_show: '노쇼',
}

const STATUS_COLOR: Record<Booking['status'], string> = {
  pending: 'bg-roselight text-deepbrown',
  confirmed: 'bg-warmbrown text-nude',
  completed: 'bg-greige text-muted',
  cancelled: 'bg-cream-light text-muted line-through',
  no_show: 'bg-cream-light text-muted',
}

const EXPERIENCE_LABEL: Record<string, string> = {
  first: '처음',
  before: '받아본 적 있음',
  retouch: '리터치',
}

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'confirmed', label: '확정' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '취소' },
]

function formatPhone(p: string) {
  const digits = p.replace(/\D/g, '')
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return p
}

function formatDateTime(date: string | null, time: string | null) {
  if (!date) return '미정'
  const d = new Date(date + 'T00:00:00')
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  const md = `${d.getMonth() + 1}/${d.getDate()}(${wd})`
  return time ? `${md} ${time.slice(0, 5)}` : md
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: salon } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!salon) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('bookings')
      .select(
        `id, customer_name, customer_phone, customer_email, consultation,
         desired_date, desired_time, customer_memo, status,
         deposit_amount, deposit_status, created_at,
         menu:menus(name, price, duration_minutes),
         consents(id)`
      )
      .eq('salon_id', salon.id)
      .order('desired_date', { ascending: true, nullsFirst: false })
      .order('desired_time', { ascending: true, nullsFirst: false })

    setBookings((data as unknown as Booking[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateStatus = async (id: string, status: Booking['status']) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
    if (error) {
      alert('변경 실패: ' + error.message)
      return
    }
    load()
  }

  const toggleDeposit = async (b: Booking) => {
    const next = b.deposit_status === 'paid' ? 'unpaid' : 'paid'
    const { error } = await supabase
      .from('bookings')
      .update({ deposit_status: next })
      .eq('id', b.id)
    if (error) {
      alert('변경 실패: ' + error.message)
      return
    }
    load()
  }

  const filtered =
    filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter(
      (b) => b.status === 'cancelled' || b.status === 'no_show'
    ).length,
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-greige bg-cream-light">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              title="홈으로"
              className="px-2.5 py-1.5 rounded-lg border border-greige bg-white text-deepbrown hover:bg-nude transition text-base"
            >
              🏠
            </Link>
            <span className="font-display font-bold text-lg tracking-tight text-deepbrown ml-1">
              예약 관리
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {/* 상태 필터 */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-full border transition ${
                filter === f.key
                  ? 'bg-warmbrown text-nude border-warmbrown'
                  : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
              }`}
            >
              {f.label}{' '}
              <span
                className={`ml-1 ${
                  filter === f.key ? 'opacity-80' : 'text-muted'
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-sm font-light text-muted">불러오는 중...</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-cream-light border border-greige rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-bold text-deepbrown tracking-tight mb-1">
              {filter === 'all' ? '예약이 없어요' : '해당 상태 예약이 없어요'}
            </p>
            <p className="text-sm font-light text-muted">
              손님이 예약하면 여기 떠요.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((b) => {
            const expanded = expandedId === b.id
            const isCancelled =
              b.status === 'cancelled' || b.status === 'no_show'
            return (
              <article
                key={b.id}
                className={`bg-cream-light border border-greige rounded-2xl overflow-hidden ${
                  isCancelled ? 'opacity-60' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : b.id)}
                  className="w-full p-5 text-left hover:bg-nude/40 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status]}`}
                        >
                          {STATUS_LABEL[b.status]}
                        </span>
                        {b.deposit_amount > 0 && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              b.deposit_status === 'paid'
                                ? 'bg-warmbrown text-nude'
                                : 'bg-greige text-muted'
                            }`}
                          >
                            {b.deposit_status === 'paid'
                              ? '💰 입금됨'
                              : '💸 입금대기'}
                          </span>
                        )}
                        {b.consents && b.consents.length > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warmbrown/15 text-deepbrown">
                            ✍️ 동의서 작성됨
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-deepbrown tracking-tight">
                        {b.customer_name}{' '}
                        <span className="font-light text-xs text-muted">
                          · {formatPhone(b.customer_phone)}
                        </span>
                      </p>
                      <p className="text-sm font-light text-muted mt-0.5">
                        {b.menu?.name ?? '메뉴 삭제됨'}
                        {b.menu && (
                          <span className="text-xs ml-1">
                            · {b.menu.duration_minutes}분 ·{' '}
                            {b.menu.price.toLocaleString()}원
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-semibold text-sm text-deepbrown tracking-tight">
                        {formatDateTime(b.desired_date, b.desired_time)}
                      </p>
                      <p className="text-[10px] font-light text-muted mt-0.5">
                        신청 {new Date(b.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-greige bg-white px-5 py-4 space-y-3">
                    {/* 상담 정보 */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                        시술 경험
                      </p>
                      <p className="text-sm text-deepbrown">
                        {EXPERIENCE_LABEL[
                          b.consultation?.experience ?? 'first'
                        ] ?? '미입력'}
                      </p>
                    </div>
                    {b.consultation?.memo && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                          상담 메모
                        </p>
                        <p className="text-sm text-deepbrown whitespace-pre-line leading-relaxed">
                          {b.consultation.memo}
                        </p>
                      </div>
                    )}
                    {b.customer_memo && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                          추가 요청
                        </p>
                        <p className="text-sm text-deepbrown whitespace-pre-line leading-relaxed">
                          {b.customer_memo}
                        </p>
                      </div>
                    )}
                    {b.customer_email && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                          이메일
                        </p>
                        <p className="text-sm text-deepbrown">
                          {b.customer_email}
                        </p>
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-greige">
                      {b.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(b.id, 'confirmed')}
                            className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
                          >
                            ✓ 예약 확정
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, 'cancelled')}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-greige text-muted hover:bg-cream-light transition"
                          >
                            취소 처리
                          </button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => updateStatus(b.id, 'completed')}
                            className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
                          >
                            ✓ 시술 완료
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, 'no_show')}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-greige text-muted hover:bg-cream-light transition"
                          >
                            노쇼
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, 'cancelled')}
                            className="px-4 py-2 rounded-lg text-xs font-semibold border border-greige text-muted hover:bg-cream-light transition"
                          >
                            취소
                          </button>
                        </>
                      )}
                      {(b.status === 'cancelled' ||
                        b.status === 'no_show' ||
                        b.status === 'completed') && (
                        <button
                          onClick={() => updateStatus(b.id, 'pending')}
                          className="px-4 py-2 rounded-lg text-xs font-semibold border border-greige text-muted hover:bg-cream-light transition"
                        >
                          ↺ 대기로 되돌리기
                        </button>
                      )}
                      {b.deposit_amount > 0 && (
                        <button
                          onClick={() => toggleDeposit(b)}
                          className={`ml-auto px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                            b.deposit_status === 'paid'
                              ? 'bg-warmbrown text-nude border-warmbrown'
                              : 'border-greige text-deepbrown hover:bg-cream-light'
                          }`}
                        >
                          {b.deposit_status === 'paid'
                            ? '💰 입금 확인됨'
                            : '입금 확인'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
