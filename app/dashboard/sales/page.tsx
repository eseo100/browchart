'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SalesBooking = {
  id: string
  customer_name: string
  customer_phone: string
  desired_date: string | null
  status: string
  deposit_amount: number
  deposit_status: string
  menu: { name: string; price: number; category: string } | null
}

type Period = 'thisMonth' | 'lastMonth' | 'thisYear' | 'all'

const PERIOD_LABEL: Record<Period, string> = {
  thisMonth: '이번 달',
  lastMonth: '지난 달',
  thisYear: '올해',
  all: '전체',
}

const CATEGORY_LABEL: Record<string, string> = {
  eyebrow: '눈썹문신',
  lip: '입술문신',
  eyelash: '속눈썹펌',
  retouch: '리터치',
  removal: '제거/커버업',
  other: '기타',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getRange(period: Period) {
  const now = new Date()
  if (period === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start: ymd(start), end: ymd(end) }
  }
  if (period === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: ymd(start), end: ymd(end) }
  }
  if (period === 'thisYear') {
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31)
    return { start: ymd(start), end: ymd(end) }
  }
  return { start: '2000-01-01', end: ymd(new Date(2999, 0, 1)) }
}

function formatMoney(n: number) {
  return n.toLocaleString() + '원'
}

export default function SalesPage() {
  const [bookings, setBookings] = useState<SalesBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('thisMonth')

  useEffect(() => {
    const load = async () => {
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
          `id, customer_name, customer_phone, desired_date, status,
           deposit_amount, deposit_status,
           menu:menus(name, price, category)`
        )
        .eq('salon_id', salon.id)

      setBookings((data as unknown as SalesBooking[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const { start, end } = useMemo(() => getRange(period), [period])

  // 시술 완료 예약만 매출로 잡음
  const completed = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status !== 'completed') return false
      if (!b.desired_date) return false
      return b.desired_date >= start && b.desired_date <= end
    })
  }, [bookings, start, end])

  const totalRevenue = useMemo(
    () => completed.reduce((sum, b) => sum + (b.menu?.price ?? 0), 0),
    [completed]
  )
  const totalCount = completed.length
  const avgPrice = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0

  // 메뉴별 합계
  const byMenu = useMemo(() => {
    const map = new Map<
      string,
      { name: string; category: string; count: number; revenue: number }
    >()
    for (const b of completed) {
      if (!b.menu) continue
      const key = b.menu.name
      const cur = map.get(key) ?? {
        name: b.menu.name,
        category: b.menu.category,
        count: 0,
        revenue: 0,
      }
      cur.count++
      cur.revenue += b.menu.price
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [completed])

  // 카테고리별 합계 (도넛 느낌)
  const byCategory = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>()
    for (const b of completed) {
      if (!b.menu) continue
      const key = b.menu.category
      const cur = map.get(key) ?? { count: 0, revenue: 0 }
      cur.count++
      cur.revenue += b.menu.price
      map.set(key, cur)
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [completed])

  // 일별 매출 (해당 기간 내)
  const byDate = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>()
    for (const b of completed) {
      if (!b.desired_date) continue
      const cur = map.get(b.desired_date) ?? { count: 0, revenue: 0 }
      cur.count++
      cur.revenue += b.menu?.price ?? 0
      map.set(b.desired_date, cur)
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [completed])

  const maxDailyRevenue = Math.max(1, ...byDate.map((d) => d.revenue))

  // 미수금: 확정인데 입금 미완
  const pendingDeposit = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'confirmed' &&
        b.deposit_amount > 0 &&
        b.deposit_status === 'unpaid'
    )
  }, [bookings])
  const pendingDepositTotal = pendingDeposit.reduce(
    (s, b) => s + b.deposit_amount,
    0
  )

  return (
    <div className="min-h-screen">
      <header className="border-b border-greige bg-cream-light">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2">
          <Link
            href="/dashboard"
            title="홈으로"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-greige bg-white text-deepbrown hover:bg-nude transition"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 11.5 L12 4 L21 11.5" />
              <path d="M5 10 V20 H19 V10" />
              <path d="M10 20 V14 H14 V20" />
            </svg>
          </Link>
          <span className="font-display font-bold text-lg tracking-tight text-deepbrown ml-1">
            매출 관리
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* 기간 필터 */}
        <div className="flex flex-wrap gap-2">
          {(['thisMonth', 'lastMonth', 'thisYear', 'all'] as Period[]).map(
            (p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition ${
                  period === p
                    ? 'bg-warmbrown text-nude border-warmbrown'
                    : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            )
          )}
        </div>

        {loading ? (
          <p className="text-sm font-light text-muted">불러오는 중...</p>
        ) : (
          <>
            {/* 핵심 지표 */}
            <section>
              <p className="text-xs font-light text-muted mb-2">
                {start} ~ {end} (시술 완료 기준)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-cream-light border border-greige rounded-2xl p-5">
                  <p className="text-xs font-light text-muted">총 매출</p>
                  <p className="font-display font-bold text-3xl tracking-tight text-deepbrown mt-1">
                    {formatMoney(totalRevenue)}
                  </p>
                </div>
                <div className="bg-cream-light border border-greige rounded-2xl p-5">
                  <p className="text-xs font-light text-muted">시술 건수</p>
                  <p className="font-display font-bold text-3xl tracking-tight text-deepbrown mt-1">
                    {totalCount}건
                  </p>
                </div>
                <div className="bg-cream-light border border-greige rounded-2xl p-5">
                  <p className="text-xs font-light text-muted">평균 객단가</p>
                  <p className="font-display font-bold text-3xl tracking-tight text-deepbrown mt-1">
                    {formatMoney(avgPrice)}
                  </p>
                </div>
              </div>
            </section>

            {/* 미수금 알림 */}
            {pendingDeposit.length > 0 && (
              <section className="bg-roselight/40 border border-softpink rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-light text-muted">
                      💸 미수금 (입금 대기)
                    </p>
                    <p className="font-display font-bold text-2xl text-deepbrown mt-1">
                      {formatMoney(pendingDepositTotal)}
                    </p>
                    <p className="text-[11px] font-light text-muted mt-1">
                      확정된 예약 {pendingDeposit.length}건의 예약금이 아직 입금
                      안 됐어요.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/bookings"
                    className="shrink-0 text-xs font-semibold text-deepbrown underline"
                  >
                    예약 관리에서 확인 →
                  </Link>
                </div>
              </section>
            )}

            {/* 메뉴별 매출 */}
            <section>
              <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-3">
                메뉴별 매출
              </h2>
              {byMenu.length === 0 ? (
                <div className="bg-cream-light border border-greige rounded-2xl p-8 text-center">
                  <p className="text-sm font-light text-muted">
                    이 기간에 시술 완료된 예약이 없어요.
                  </p>
                </div>
              ) : (
                <div className="bg-cream-light border border-greige rounded-2xl overflow-hidden">
                  {byMenu.map((m, i) => {
                    const ratio = (m.revenue / totalRevenue) * 100
                    return (
                      <div
                        key={m.name}
                        className={`p-4 ${i > 0 ? 'border-t border-greige' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                              {CATEGORY_LABEL[m.category] ?? m.category}
                            </p>
                            <p className="font-bold text-deepbrown tracking-tight truncate">
                              {m.name}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display font-bold text-deepbrown">
                              {formatMoney(m.revenue)}
                            </p>
                            <p className="text-xs font-light text-muted">
                              {m.count}건 · {ratio.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        {/* 막대 */}
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warmbrown rounded-full"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* 카테고리별 요약 */}
            {byCategory.length > 1 && (
              <section>
                <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-3">
                  카테고리 분포
                </h2>
                <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-2">
                  {byCategory.map((c) => {
                    const ratio = (c.revenue / totalRevenue) * 100
                    return (
                      <div key={c.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-deepbrown">
                            {CATEGORY_LABEL[c.category] ?? c.category}
                          </span>
                          <span className="font-light text-muted">
                            {c.count}건 · {formatMoney(c.revenue)} · {ratio.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-softpink rounded-full"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 일별 매출 */}
            {byDate.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-3">
                  일별 매출
                </h2>
                <div className="bg-cream-light border border-greige rounded-2xl p-5">
                  <div className="space-y-1.5">
                    {byDate.map((d) => {
                      const ratio = (d.revenue / maxDailyRevenue) * 100
                      const date = new Date(d.date + 'T00:00:00')
                      const md = `${date.getMonth() + 1}/${date.getDate()}`
                      const wd = ['일', '월', '화', '수', '목', '금', '토'][
                        date.getDay()
                      ]
                      return (
                        <div
                          key={d.date}
                          className="grid grid-cols-[60px_1fr_120px] items-center gap-3 text-xs"
                        >
                          <span className="font-display font-semibold text-deepbrown">
                            {md} ({wd})
                          </span>
                          <div className="h-4 bg-white rounded">
                            <div
                              className="h-full bg-warmbrown rounded"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                          <span className="text-right font-display font-medium text-deepbrown">
                            {formatMoney(d.revenue)}{' '}
                            <span className="font-light text-muted">
                              ({d.count}건)
                            </span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            <p className="text-[11px] font-light text-muted text-center pt-4">
              * 매출은 <span className="font-semibold">시술 완료</span> 처리된
              예약 기준이에요. 예약 관리에서 시술 완료 처리해야 매출에 반영돼요.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
