'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type DayHours = { open: number; close: number; closed: boolean }

type Props = {
  date: string // YYYY-MM-DD
  time: string // HH:MM
  onChange: (date: string, time: string) => void
  salonId: string
  currentMenuDuration: number // 분
  businessHours?: DayHours[] | null
  closedDates?: string[]
  fallbackOpen?: number
  fallbackClose?: number
  slotMinutes?: 30 | 60
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getCalendarCells(year: number, month: number) {
  // month: 0~11
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

export default function DateTimePicker({
  date,
  time,
  onChange,
  salonId,
  currentMenuDuration,
  businessHours,
  closedDates = [],
  fallbackOpen = 10,
  fallbackClose = 19,
  slotMinutes: initialSlot = 30,
}: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const slotMinutes = initialSlot
  const [occupiedRanges, setOccupiedRanges] = useState<[number, number][]>([])

  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  // 특정 요일의 시간 정보 가져오기
  const getDayHours = (dayOfWeek: number): DayHours => {
    if (businessHours && businessHours[dayOfWeek]) {
      return businessHours[dayOfWeek]
    }
    return { open: fallbackOpen, close: fallbackClose, closed: false }
  }

  // 특정 날짜가 휴무인지 (요일 휴무 OR 특정날짜 휴무)
  const isDateClosed = (d: Date): boolean => {
    const ymdStr = ymd(d)
    if (closedDates.includes(ymdStr)) return true
    const dh = getDayHours(d.getDay())
    return dh.closed
  }

  // 선택한 날짜의 시간 슬롯 계산 (해당 요일 영업시간 기반)
  const slots = useMemo(() => {
    if (!date) return []
    const d = new Date(date + 'T00:00:00')
    const dh = getDayHours(d.getDay())
    if (dh.closed || closedDates.includes(date)) return []
    const arr: string[] = []
    for (let h = dh.open; h < dh.close; h++) {
      arr.push(`${pad(h)}:00`)
      if (slotMinutes === 30) arr.push(`${pad(h)}:30`)
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, businessHours, closedDates, slotMinutes])

  // 선택한 날짜의 기존 예약 시간 가져오기
  useEffect(() => {
    if (!date || !salonId) {
      setOccupiedRanges([])
      return
    }
    let cancelled = false
    supabase
      .from('booking_slots')
      .select('desired_time, duration_minutes')
      .eq('salon_id', salonId)
      .eq('desired_date', date)
      .then(({ data }) => {
        if (cancelled) return
        const ranges: [number, number][] = []
        for (const row of data ?? []) {
          if (!row.desired_time) continue
          const [h, m] = row.desired_time.split(':').map(Number)
          const start = h * 60 + m
          const end = start + (row.duration_minutes ?? 60)
          ranges.push([start, end])
        }
        setOccupiedRanges(ranges)
      })
    return () => {
      cancelled = true
    }
  }, [date, salonId])

  // 슬롯 상태: ok | taken (이미 예약) | overflow (영업시간 초과)
  const slotState = (slotStr: string): 'ok' | 'taken' | 'overflow' => {
    const [h, m] = slotStr.split(':').map(Number)
    const start = h * 60 + m
    const end = start + currentMenuDuration
    // 해당 날짜의 마감 시간 기준
    const dayEnd = date
      ? getDayHours(new Date(date + 'T00:00:00').getDay()).close
      : fallbackClose
    if (end > dayEnd * 60) return 'overflow'
    const conflict = occupiedRanges.some(
      ([os, oe]) => start < oe && os < end
    )
    return conflict ? 'taken' : 'ok'
  }

  // 지금 손님이 선택한 시술 범위 안에 들어가는 슬롯인지
  // (시작 슬롯만 진하게, 이어지는 슬롯은 연한 핑크)
  const slotInSelection = (slotStr: string): 'start' | 'cont' | null => {
    if (!time || !date) return null
    const [h, m] = slotStr.split(':').map(Number)
    const slotMin = h * 60 + m
    const [th, tm] = time.split(':').map(Number)
    const tStart = th * 60 + tm
    const tEnd = tStart + currentMenuDuration
    if (slotMin === tStart) return 'start'
    if (slotMin > tStart && slotMin < tEnd) return 'cont'
    return null
  }

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

  const isPast = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x.getTime() < today.getTime()
  }

  return (
    <div className="space-y-4">
      {/* 달력 */}
      <div className="bg-white border border-greige rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={goPrev}
            className="w-8 h-8 rounded-lg hover:bg-cream-light text-deepbrown font-semibold"
            aria-label="이전 달"
          >
            ‹
          </button>
          <p className="font-display font-semibold text-deepbrown tracking-tight">
            {viewYear}년 {viewMonth + 1}월
          </p>
          <button
            type="button"
            onClick={goNext}
            className="w-8 h-8 rounded-lg hover:bg-cream-light text-deepbrown font-semibold"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1.5">
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

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell.date) {
              return <div key={i} />
            }
            const cellStr = ymd(cell.date)
            const past = isPast(cell.date)
            const selected = cellStr === date
            const dayOfWeek = cell.date.getDay()
            const closed = !past && isDateClosed(cell.date)

            return (
              <button
                key={i}
                type="button"
                disabled={past || closed}
                onClick={() => onChange(cellStr, time)}
                className={`relative aspect-square text-sm font-medium rounded-lg transition ${
                  selected
                    ? 'bg-warmbrown text-nude'
                    : past
                      ? 'text-greige cursor-not-allowed'
                      : closed
                        ? 'text-greige bg-cream-light/40 cursor-not-allowed line-through'
                        : dayOfWeek === 0
                          ? 'text-softpink hover:bg-cream-light'
                          : 'text-deepbrown hover:bg-cream-light'
                }`}
                title={closed ? '휴무일' : undefined}
              >
                {cell.date.getDate()}
                {closed && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-softpink leading-none">
                    휴무
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 시간 슬롯 */}
      <div>
        <div className="mb-2.5">
          <p className="text-xs font-medium text-deepbrown">
            {date ? (
              <>
                <span className="font-display">{date}</span> 시간 선택
              </>
            ) : (
              '날짜를 먼저 선택해주세요'
            )}
          </p>
        </div>

        {/* 휴무일이면 슬롯 대신 안내 */}
        {date && slots.length === 0 && (
          <div className="bg-cream-light border border-greige rounded-xl p-6 text-center">
            <p className="text-3xl mb-2">🔒</p>
            <p className="text-sm font-medium text-deepbrown">휴무일이에요</p>
            <p className="text-xs font-light text-muted mt-1">
              다른 날짜를 선택해주세요.
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {slots.map((s) => {
            const inSel = slotInSelection(s)
            const state = date ? slotState(s) : 'ok'
            const disabled = !date || state !== 'ok'
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => onChange(date, s)}
                className={`relative px-2 py-2 text-xs font-semibold rounded-lg border transition ${
                  inSel === 'start'
                    ? 'bg-warmbrown text-nude border-warmbrown'
                    : inSel === 'cont'
                      ? 'bg-roselight text-deepbrown border-roselight'
                      : !date
                        ? 'bg-cream-light text-greige border-greige cursor-not-allowed'
                        : state === 'taken'
                          ? 'bg-cream-light text-muted border-greige line-through cursor-not-allowed'
                          : state === 'overflow'
                            ? 'bg-cream-light text-greige border-greige cursor-not-allowed'
                            : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
                }`}
                title={
                  state === 'taken'
                    ? '이미 예약된 시간이에요'
                    : state === 'overflow'
                      ? '시술 시간이 영업시간을 넘어요'
                      : inSel === 'cont'
                        ? '시술이 진행되는 시간이에요'
                        : undefined
                }
              >
                {s}
                {state === 'taken' && !inSel && (
                  <span className="block text-[9px] font-light mt-0.5">
                    예약됨
                  </span>
                )}
                {inSel === 'cont' && (
                  <span className="block text-[9px] font-light mt-0.5">
                    진행중
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {date && currentMenuDuration > 0 && (
          <p className="text-[11px] font-light text-muted mt-2">
            * 선택한 시술은 {currentMenuDuration}분 진행돼요. 그 시간에 다른
            예약이 있으면 자동으로 막혀요.
          </p>
        )}
      </div>
    </div>
  )
}
