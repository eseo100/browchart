'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type CalendarBooking = {
  id: string
  customer_name: string
  customer_phone: string
  desired_date: string
  desired_time: string | null
  status: string
  menu: { name: string; duration_minutes: number } | null
}

type DayHours = { open: number; close: number; closed: boolean }

type Props = {
  salonId: string
  businessHours?: DayHours[] | null
  closedDates?: string[]
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-softpink',
  confirmed: 'bg-warmbrown',
  completed: 'bg-greige',
  cancelled: 'bg-greige',
  no_show: 'bg-greige',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getCalendarCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date | null }[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d) })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null })
  return cells
}

export default function CalendarView({
  salonId,
  businessHours,
  closedDates = [],
}: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(ymd(today))
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [customerByPhone, setCustomerByPhone] = useState<
    Record<string, string>
  >({})

  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const load = useCallback(async () => {
    setLoading(true)
    // 보이는 달의 시작/끝
    const start = new Date(viewYear, viewMonth, 1)
    const end = new Date(viewYear, viewMonth + 1, 0)
    const startStr = ymd(start)
    const endStr = ymd(end)

    const [{ data: bookingData }, { data: customerData }] = await Promise.all([
      supabase
        .from('bookings')
        .select(
          `id, customer_name, customer_phone, desired_date, desired_time, status,
           menu:menus(name, duration_minutes)`
        )
        .eq('salon_id', salonId)
        .gte('desired_date', startStr)
        .lte('desired_date', endStr)
        .order('desired_date')
        .order('desired_time'),
      supabase
        .from('customers')
        .select('id, phone')
        .eq('salon_id', salonId),
    ])

    setBookings((bookingData as unknown as CalendarBooking[]) ?? [])
    const map: Record<string, string> = {}
    for (const c of customerData ?? []) {
      map[(c as { phone: string }).phone] = (c as { id: string }).id
    }
    setCustomerByPhone(map)
    setLoading(false)
  }, [salonId, viewYear, viewMonth])

  useEffect(() => {
    load()
  }, [load])

  const goPrev = () => {
    const m = viewMonth - 1
    if (m < 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth(m)
    }
  }
  const goNext = () => {
    const m = viewMonth + 1
    if (m > 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth(m)
    }
  }
  const goToday = () => {
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    setSelectedDate(ymd(d))
  }

  // 날짜별 예약 그룹
  const byDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {}
    for (const b of bookings) {
      if (!b.desired_date) continue
      if (b.status === 'cancelled' || b.status === 'no_show') continue
      if (!map[b.desired_date]) map[b.desired_date] = []
      map[b.desired_date].push(b)
    }
    return map
  }, [bookings])

  const selectedBookings = byDate[selectedDate] ?? []

  // 선택일의 영업시간 (요일 기준, 없으면 기본 10~19)
  const selectedDayHours = (() => {
    if (!selectedDate) return { open: 10, close: 19, closed: false }
    const d = new Date(selectedDate + 'T00:00:00')
    const dow = d.getDay()
    const fromHours = businessHours?.[dow]
    if (fromHours) return fromHours
    return { open: 10, close: 19, closed: false }
  })()

  const isSelectedClosed =
    selectedDayHours.closed || closedDates.includes(selectedDate)

  // 타임테이블 — 30분 단위 행
  const SLOT_PX = 32 // 30분 1행 높이 (1시간 = 64px)
  const totalSlots = (selectedDayHours.close - selectedDayHours.open) * 2

  const parseTimeMin = (timeStr: string | null) => {
    if (!timeStr) return null
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* 캘린더 */}
        <div className="bg-cream-light border border-greige rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goPrev}
              className="w-8 h-8 rounded-lg hover:bg-nude text-deepbrown font-semibold"
              aria-label="이전 달"
            >
              ‹
            </button>
            <div className="flex items-center gap-2">
              <p className="font-display font-bold text-deepbrown tracking-tight">
                {viewYear}년 {viewMonth + 1}월
              </p>
              <button
                type="button"
                onClick={goToday}
                className="text-[11px] font-semibold text-muted hover:text-deepbrown underline"
              >
                오늘
              </button>
            </div>
            <button
              type="button"
              onClick={goNext}
              className="w-8 h-8 rounded-lg hover:bg-nude text-deepbrown font-semibold"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`text-[11px] font-semibold text-center py-1 ${
                  i === 0
                    ? 'text-softpink'
                    : i === 6
                      ? 'text-warmbrown'
                      : 'text-muted'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 셀 */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell.date) {
                return <div key={i} className="min-h-[60px] sm:min-h-[80px]" />
              }
              const cellStr = ymd(cell.date)
              const isToday = cellStr === ymd(today)
              const selected = cellStr === selectedDate
              const dayOfWeek = cell.date.getDay()
              const dayBookings = byDate[cellStr] ?? []

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDate(cellStr)}
                  className={`min-h-[60px] sm:min-h-[80px] p-1 sm:p-1.5 text-left rounded-lg transition border ${
                    selected
                      ? 'bg-warmbrown text-nude border-warmbrown'
                      : isToday
                        ? 'bg-nude border-warmbrown text-deepbrown hover:bg-cream-light'
                        : 'bg-white border-transparent hover:border-greige text-deepbrown'
                  }`}
                >
                  <div
                    className={`text-xs font-semibold mb-0.5 ${
                      selected
                        ? 'text-nude'
                        : dayOfWeek === 0
                          ? 'text-softpink'
                          : dayOfWeek === 6
                            ? 'text-warmbrown'
                            : 'text-deepbrown'
                    }`}
                  >
                    {cell.date.getDate()}
                  </div>
                  {/* 미니 예약 목록 */}
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 2).map((b) => (
                      <div
                        key={b.id}
                        className={`text-[9px] sm:text-[10px] leading-tight truncate flex items-center gap-1 ${
                          selected ? 'text-nude/90' : 'text-muted'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full shrink-0 ${
                            selected ? 'bg-nude/70' : STATUS_DOT[b.status]
                          }`}
                        />
                        <span className="truncate">
                          {b.desired_time?.slice(0, 5) ?? ''}{' '}
                          {b.customer_name}
                        </span>
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div
                        className={`text-[9px] font-semibold ${
                          selected ? 'text-nude/80' : 'text-muted'
                        }`}
                      >
                        +{dayBookings.length - 2}건
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 선택한 날짜 타임테이블 — 캘린더와 같은 높이, 내부 스크롤 */}
        <div className="bg-cream-light border border-greige rounded-2xl p-4 lg:h-full flex flex-col min-h-[400px]">
          <div className="shrink-0 mb-3">
            <p className="font-display font-bold text-base tracking-tight text-deepbrown mb-1">
              {(() => {
                const d = new Date(selectedDate + 'T00:00:00')
                const wd = WEEKDAYS[d.getDay()]
                return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`
              })()}
            </p>
            <p className="text-xs font-light text-muted mb-2">
              {isSelectedClosed
                ? '🔒 휴무'
                : `${selectedDayHours.open}:00 ~ ${selectedDayHours.close}:00 영업 · ${selectedBookings.length}건`}
            </p>
            {/* 색상 범례 */}
            {!isSelectedClosed && (
              <div className="flex items-center gap-2.5 text-[10px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-roselight border border-softpink" />
                  <span className="font-medium text-muted">대기</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-warmbrown" />
                  <span className="font-medium text-muted">확정</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-greige" />
                  <span className="font-medium text-muted">완료</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto -mx-4 px-4">
            <div className="space-y-3">

          {loading ? (
            <p className="text-sm font-light text-muted">불러오는 중...</p>
          ) : isSelectedClosed ? (
            <div className="bg-white border border-greige rounded-xl p-6 text-center">
              <p className="text-2xl mb-1">🔒</p>
              <p className="text-sm font-medium text-deepbrown">휴무일</p>
              {selectedBookings.length > 0 && (
                <p className="text-[11px] font-light text-muted mt-2">
                  ⚠️ 예약 {selectedBookings.length}건 있음
                </p>
              )}
            </div>
          ) : (
            <div className="relative bg-white border-2 border-greige rounded-xl overflow-hidden">
              {/* 30분 단위 행 (테이블 베이스) */}
              {Array.from({ length: totalSlots }).map((_, i) => {
                const totalMin = selectedDayHours.open * 60 + i * 30
                const h = Math.floor(totalMin / 60)
                const m = totalMin % 60
                const isHour = m === 0
                return (
                  <div
                    key={i}
                    className={`flex items-stretch ${
                      i === 0
                        ? ''
                        : isHour
                          ? 'border-t-2 border-greige'
                          : 'border-t border-greige/50'
                    }`}
                    style={{ height: `${SLOT_PX}px` }}
                  >
                    <div
                      className={`w-12 shrink-0 px-2 pt-1 ${
                        isHour
                          ? 'font-display text-xs font-bold text-deepbrown'
                          : 'font-display text-[10px] font-light text-muted'
                      }`}
                    >
                      {pad(h)}:{pad(m)}
                    </div>
                    <div
                      className={`flex-1 ${
                        isHour ? '' : 'border-l border-greige/30'
                      }`}
                    />
                  </div>
                )
              })}

              {/* 마지막 마감 라인 */}
              <div className="border-t-2 border-greige" />

              {/* 예약 블록 (절대 위치, 행 위에 겹침, 클릭 시 고객 차트로) */}
              {selectedBookings.map((b) => {
                const startMin = parseTimeMin(b.desired_time)
                if (startMin === null) return null
                const offsetMin = startMin - selectedDayHours.open * 60
                if (offsetMin < 0) return null
                const duration = b.menu?.duration_minutes ?? 60
                const top = (offsetMin / 30) * SLOT_PX
                const height = Math.max((duration / 30) * SLOT_PX, SLOT_PX)
                const baseStyle =
                  b.status === 'pending'
                    ? 'bg-roselight border-softpink text-deepbrown hover:bg-softpink/40'
                    : b.status === 'confirmed'
                      ? 'bg-warmbrown text-nude border-warmbrown hover:opacity-90'
                      : 'bg-greige text-deepbrown border-greige hover:bg-greige/70'
                const customerId = customerByPhone[b.customer_phone]
                const href = customerId
                  ? `/dashboard/customers/${customerId}`
                  : `/dashboard/bookings`
                return (
                  <Link
                    key={b.id}
                    href={href}
                    className={`absolute left-12 right-2 rounded-md border-2 px-2 py-1 overflow-hidden shadow-sm transition cursor-pointer ${baseStyle}`}
                    style={{
                      top: `${top}px`,
                      height: `${height - 2}px`,
                    }}
                    title={`${b.desired_time?.slice(0, 5)} · ${b.customer_name} · ${b.menu?.name ?? ''} (클릭하면 고객 차트)`}
                  >
                    <p className="text-[10px] font-display font-bold leading-none mb-0.5">
                      {b.desired_time?.slice(0, 5)}
                    </p>
                    <p className="text-[11px] font-bold leading-tight truncate">
                      {b.customer_name}
                    </p>
                    {height >= 50 && b.menu?.name && (
                      <p className="text-[9px] font-light leading-tight truncate opacity-80">
                        {b.menu.name}
                      </p>
                    )}
                  </Link>
                )
              })}

              {/* 예약 없을 때 안내 */}
              {selectedBookings.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs font-light text-muted bg-white/80 px-3 py-1 rounded">
                    이 날 예약이 없어요
                  </p>
                </div>
              )}
            </div>
          )}

              {/* 시간 미정 예약 (별도 표시) */}
              {!isSelectedClosed &&
                selectedBookings.some((b) => !b.desired_time) && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                      시간 미정
                    </p>
                    <div className="space-y-1">
                      {selectedBookings
                        .filter((b) => !b.desired_time)
                        .map((b) => {
                          const customerId =
                            customerByPhone[b.customer_phone]
                          const href = customerId
                            ? `/dashboard/customers/${customerId}`
                            : `/dashboard/bookings`
                          return (
                            <Link
                              key={b.id}
                              href={href}
                              className="block bg-white border border-greige rounded-md p-2 hover:border-warmbrown transition"
                            >
                              <p className="text-xs font-bold text-deepbrown">
                                {b.customer_name}
                              </p>
                              {b.menu?.name && (
                                <p className="text-[10px] font-light text-muted">
                                  {b.menu.name}
                                </p>
                              )}
                            </Link>
                          )
                        })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
