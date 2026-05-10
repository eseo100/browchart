'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type CalendarBooking = {
  id: string
  customer_name: string
  desired_date: string
  desired_time: string | null
  status: string
  menu: { name: string; duration_minutes: number } | null
}

type Props = {
  salonId: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
  no_show: '노쇼',
}

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

export default function CalendarView({ salonId }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(ymd(today))
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [loading, setLoading] = useState(true)

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

    const { data } = await supabase
      .from('bookings')
      .select(
        `id, customer_name, desired_date, desired_time, status,
         menu:menus(name, duration_minutes)`
      )
      .eq('salon_id', salonId)
      .gte('desired_date', startStr)
      .lte('desired_date', endStr)
      .order('desired_date')
      .order('desired_time')

    setBookings((data as unknown as CalendarBooking[]) ?? [])
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

        {/* 선택한 날짜 디테일 */}
        <div className="bg-cream-light border border-greige rounded-2xl p-5 lg:max-h-[500px] lg:overflow-y-auto">
          <p className="font-display font-bold text-base tracking-tight text-deepbrown mb-1">
            {(() => {
              const d = new Date(selectedDate + 'T00:00:00')
              const wd = WEEKDAYS[d.getDay()]
              return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`
            })()}
          </p>
          <p className="text-xs font-light text-muted mb-4">
            {selectedBookings.length}건의 예약
          </p>

          {loading ? (
            <p className="text-sm font-light text-muted">불러오는 중...</p>
          ) : selectedBookings.length === 0 ? (
            <p className="text-xs font-light text-muted">
              이 날 예약이 없어요.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-greige rounded-xl p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-display font-bold text-sm text-deepbrown">
                      {b.desired_time?.slice(0, 5) ?? '시간 미정'}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        b.status === 'pending'
                          ? 'bg-roselight text-deepbrown'
                          : b.status === 'confirmed'
                            ? 'bg-warmbrown text-nude'
                            : 'bg-greige text-muted'
                      }`}
                    >
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-deepbrown tracking-tight">
                    {b.customer_name}
                  </p>
                  {b.menu?.name && (
                    <p className="text-xs font-light text-muted mt-0.5">
                      {b.menu.name}
                      {b.menu.duration_minutes &&
                        ` · ${b.menu.duration_minutes}분`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
