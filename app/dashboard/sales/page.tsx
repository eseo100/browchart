'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SalesBooking = {
  id: string
  customer_id: string | null
  customer_name: string
  desired_date: string | null
  status: string
  deposit_amount: number
  deposit_status: string
  menu: { name: string; price: number; category: string } | null
}

type QuickSale = {
  id: string
  salon_id: string
  customer_id: string | null
  date: string
  customer_name: string | null
  menu_name: string
  amount: number
  memo: string | null
}

type SaleItem = {
  id: string
  type: 'booking' | 'quick'
  date: string
  customerName: string
  menuName: string
  amount: number
  category: string | null
}

type Tab = 'calendar' | 'stats'
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

function formatMoneyShort(n: number) {
  if (n >= 10000) {
    const man = Math.floor(n / 10000)
    const rest = Math.floor((n % 10000) / 1000)
    return rest > 0 ? `${man}.${rest}만` : `${man}만`
  }
  return n >= 1000 ? `${Math.round(n / 1000)}천` : `${n}`
}

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>('calendar')
  const [salonId, setSalonId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<SalesBooking[]>([])
  const [quickSales, setQuickSales] = useState<QuickSale[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
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
    setSalonId(salon.id)
    const [bk, qs] = await Promise.all([
      supabase
        .from('bookings')
        .select(
          `id, customer_id, customer_name, desired_date, status,
           deposit_amount, deposit_status,
           menu:menus(name, price, category)`
        )
        .eq('salon_id', salon.id),
      supabase
        .from('quick_sales')
        .select('*')
        .eq('salon_id', salon.id)
        .order('date', { ascending: false }),
    ])
    setBookings((bk.data as unknown as SalesBooking[]) ?? [])
    setQuickSales((qs.data as QuickSale[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  // booking 완료된 매출 + quick_sales 합쳐서 통합 SaleItem 배열로
  const allSales: SaleItem[] = useMemo(() => {
    const items: SaleItem[] = []
    for (const b of bookings) {
      if (b.status !== 'completed') continue
      if (!b.desired_date) continue
      if (!b.menu) continue
      items.push({
        id: 'b-' + b.id,
        type: 'booking',
        date: b.desired_date,
        customerName: b.customer_name,
        menuName: b.menu.name,
        amount: b.menu.price,
        category: b.menu.category,
      })
    }
    for (const q of quickSales) {
      items.push({
        id: 'q-' + q.id,
        type: 'quick',
        date: q.date,
        customerName: q.customer_name || '비회원',
        menuName: q.menu_name,
        amount: q.amount,
        category: null,
      })
    }
    return items
  }, [bookings, quickSales])

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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {/* 탭 */}
        <div className="flex flex-wrap gap-2 border-b border-greige pb-3">
          {(
            [
              { key: 'calendar', label: '📅 달력' },
              { key: 'stats', label: '📊 통계' },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-full border transition ${
                tab === t.key
                  ? 'bg-warmbrown text-nude border-warmbrown'
                  : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm font-light text-muted">불러오는 중...</p>
        ) : tab === 'calendar' ? (
          <CalendarTab
            allSales={allSales}
            quickSales={quickSales}
            salonId={salonId}
            onChanged={() => setReloadKey((k) => k + 1)}
          />
        ) : (
          <StatsTab bookings={bookings} quickSales={quickSales} />
        )}
      </main>
    </div>
  )
}

/* ────────────────── 달력 탭 ────────────────── */
function CalendarTab({
  allSales,
  quickSales,
  salonId,
  onChanged,
}: {
  allSales: SaleItem[]
  quickSales: QuickSale[]
  salonId: string | null
  onChanged: () => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(ymd(today))
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<QuickSale | null>(null)

  const handleDeleteQuick = async (id: string) => {
    if (!confirm('이 매출을 삭제할까요?')) return
    const { error } = await supabase.from('quick_sales').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    onChanged()
  }

  const monthStr = `${year}-${pad(month)}`
  const monthSales = useMemo(
    () => allSales.filter((s) => s.date.startsWith(monthStr)),
    [allSales, monthStr]
  )

  // 일별 합계
  const dailySums = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of monthSales) {
      m[s.date] = (m[s.date] ?? 0) + s.amount
    }
    return m
  }, [monthSales])

  const monthTotal = monthSales.reduce((sum, s) => sum + s.amount, 0)

  const daySales = useMemo(
    () => allSales.filter((s) => s.date === selectedDate),
    [allSales, selectedDate]
  )
  const dayTotal = daySales.reduce((sum, s) => sum + s.amount, 0)

  // 달력 셀 생성
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: Array<{ day: number; date: string; weekday: number } | null> = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      date: `${year}-${pad(month)}-${pad(d)}`,
      weekday: new Date(year, month - 1, d).getDay(),
    })
  }

  const goPrev = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else setMonth(month - 1)
  }
  const goNext = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else setMonth(month + 1)
  }

  return (
    <>
      {/* 월 캘린더 */}
      <section className="bg-cream-light border border-greige rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-lg hover:bg-nude text-deepbrown text-lg"
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="font-display font-bold text-base text-deepbrown">
            {year}년 {month}월
          </span>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-lg hover:bg-nude text-deepbrown text-lg"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold mb-1">
          <div className="text-softpink py-1">일</div>
          <div className="text-muted py-1">월</div>
          <div className="text-muted py-1">화</div>
          <div className="text-muted py-1">수</div>
          <div className="text-muted py-1">목</div>
          <div className="text-muted py-1">금</div>
          <div className="text-warmbrown py-1">토</div>
        </div>

        {/* 날짜 셀 */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="aspect-square" />
            const sum = dailySums[cell.date] ?? 0
            const isSelected = cell.date === selectedDate
            const isToday = cell.date === ymd(new Date())
            const dayColor =
              cell.weekday === 0
                ? 'text-softpink'
                : cell.weekday === 6
                  ? 'text-warmbrown'
                  : 'text-deepbrown'
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(cell.date)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center px-0.5 transition border ${
                  isSelected
                    ? 'bg-warmbrown border-warmbrown text-nude'
                    : isToday
                      ? 'bg-roselight border-softpink hover:border-warmbrown'
                      : 'bg-white border-transparent hover:border-greige'
                }`}
              >
                <span
                  className={`font-display text-sm font-semibold ${
                    isSelected ? 'text-nude' : dayColor
                  }`}
                >
                  {cell.day}
                </span>
                {sum > 0 && (
                  <span
                    className={`text-[9px] font-medium mt-0.5 leading-tight ${
                      isSelected ? 'text-nude/90' : 'text-muted'
                    }`}
                  >
                    {formatMoneyShort(sum)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* 합계 카드 */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-cream-light border border-greige rounded-2xl p-4">
          <p className="text-xs font-light text-muted">하루 매출</p>
          <p className="font-display font-bold text-xl text-deepbrown mt-1">
            {formatMoney(dayTotal)}
          </p>
        </div>
        <div className="bg-cream-light border border-greige rounded-2xl p-4">
          <p className="text-xs font-light text-muted">이번 달 매출</p>
          <p className="font-display font-bold text-xl text-deepbrown mt-1">
            {formatMoney(monthTotal)}
          </p>
        </div>
      </section>

      {/* 선택일 시술 목록 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base tracking-tight text-deepbrown">
            {selectedDate} 시술 목록
          </h2>
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            + 간단매출 추가
          </button>
        </div>
        {daySales.length === 0 ? (
          <div className="bg-cream-light border border-greige rounded-2xl p-8 text-center">
            <p className="text-sm font-light text-muted">이 날 매출이 없어요.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {daySales.map((s) => {
              const quickId = s.type === 'quick' ? s.id.slice(2) : null
              const original = quickId
                ? quickSales.find((q) => q.id === quickId)
                : null
              return (
                <li
                  key={s.id}
                  className="bg-cream-light border border-greige rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          s.type === 'booking'
                            ? 'bg-warmbrown/15 text-deepbrown'
                            : 'bg-softpink/40 text-deepbrown'
                        }`}
                      >
                        {s.type === 'booking' ? '예약' : '간단'}
                      </span>
                      <p className="font-bold text-deepbrown tracking-tight truncate">
                        {s.customerName}
                      </p>
                    </div>
                    <p className="text-xs font-light text-muted truncate">
                      {s.menuName}
                      {s.category && (
                        <> · {CATEGORY_LABEL[s.category] ?? s.category}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-display font-bold text-deepbrown">
                      {formatMoney(s.amount)}
                    </p>
                    {original && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditItem(original)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md border border-greige text-deepbrown hover:bg-nude"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteQuick(original.id)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md border border-greige text-softpink hover:bg-nude"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {(addModalOpen || editItem) && (
        <QuickSaleModal
          salonId={salonId}
          editItem={editItem}
          defaultDate={selectedDate}
          onClose={() => {
            setAddModalOpen(false)
            setEditItem(null)
          }}
          onSaved={() => {
            setAddModalOpen(false)
            setEditItem(null)
            onChanged()
          }}
        />
      )}
    </>
  )
}

function QuickSaleModal({
  salonId,
  editItem,
  defaultDate,
  onClose,
  onSaved,
}: {
  salonId: string | null
  editItem: QuickSale | null
  defaultDate?: string
  onClose: () => void
  onSaved: () => void
}) {
  const today = ymd(new Date())
  const [date, setDate] = useState(editItem?.date ?? defaultDate ?? today)
  const [customerName, setCustomerName] = useState(
    editItem?.customer_name ?? ''
  )
  const [menuName, setMenuName] = useState(editItem?.menu_name ?? '')
  const [amount, setAmount] = useState(
    editItem ? editItem.amount.toLocaleString() : ''
  )
  const [memo, setMemo] = useState(editItem?.memo ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!menuName.trim()) {
      alert('시술명을 입력해주세요')
      return
    }
    const digits = amount.replace(/\D/g, '')
    if (!digits) {
      alert('금액을 입력해주세요 (0원도 가능)')
      return
    }
    const num = parseInt(digits, 10)
    if (Number.isNaN(num) || num < 0) {
      alert('올바른 금액을 입력해주세요')
      return
    }
    if (!salonId) return
    setSaving(true)
    const payload = {
      salon_id: salonId,
      date,
      customer_name: customerName.trim() || null,
      menu_name: menuName.trim(),
      amount: num,
      memo: memo.trim() || null,
    }
    const { error } = editItem
      ? await supabase.from('quick_sales').update(payload).eq('id', editItem.id)
      : await supabase.from('quick_sales').insert(payload)
    setSaving(false)
    if (error) {
      alert('저장 실패: ' + error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-nude rounded-3xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-display font-bold text-lg tracking-tight text-deepbrown">
          {editItem ? '매출 수정' : '간단매출 추가'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              손님명 <span className="font-light text-muted">(선택)</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="비회원 / 손님 이름"
              className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              시술명 *
            </label>
            <input
              type="text"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder="예: 눈썹 리터치"
              className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              금액 (원) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '')
                setAmount(raw ? Number(raw).toLocaleString() : '')
              }}
              placeholder="0"
              className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              메모 <span className="font-light text-muted">(선택)</span>
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-greige text-deepbrown hover:bg-cream-light"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ────────────────── 통계 탭 (기존 분석) ────────────────── */
function StatsTab({
  bookings,
  quickSales,
}: {
  bookings: SalesBooking[]
  quickSales: QuickSale[]
}) {
  const [period, setPeriod] = useState<Period>('thisMonth')
  const { start, end } = useMemo(() => getRange(period), [period])

  const completed = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status !== 'completed') return false
      if (!b.desired_date) return false
      return b.desired_date >= start && b.desired_date <= end
    })
  }, [bookings, start, end])

  const quickInRange = useMemo(
    () => quickSales.filter((q) => q.date >= start && q.date <= end),
    [quickSales, start, end]
  )

  const bookingRevenue = completed.reduce(
    (sum, b) => sum + (b.menu?.price ?? 0),
    0
  )
  const quickRevenue = quickInRange.reduce((sum, q) => sum + q.amount, 0)
  const totalRevenue = bookingRevenue + quickRevenue
  const totalCount = completed.length + quickInRange.length
  const avgPrice = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0

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
    for (const q of quickInRange) {
      const key = q.menu_name
      const cur = map.get(key) ?? {
        name: q.menu_name,
        category: 'quick',
        count: 0,
        revenue: 0,
      }
      cur.count++
      cur.revenue += q.amount
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [completed, quickInRange])

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
    if (quickInRange.length > 0) {
      const qSum = quickInRange.reduce((s, q) => s + q.amount, 0)
      map.set('quick', { count: quickInRange.length, revenue: qSum })
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [completed, quickInRange])

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
    <>
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

      <section>
        <p className="text-xs font-light text-muted mb-2">
          {start} ~ {end} (시술완료 + 간단매출 합산)
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
                확정된 예약 {pendingDeposit.length}건의 예약금이 아직 입금 안 됐어요.
              </p>
            </div>
            <Link
              href="/dashboard/bookings"
              className="shrink-0 text-xs font-semibold text-deepbrown underline"
            >
              예약 관리 →
            </Link>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-3">
          메뉴별 매출
        </h2>
        {byMenu.length === 0 ? (
          <div className="bg-cream-light border border-greige rounded-2xl p-8 text-center">
            <p className="text-sm font-light text-muted">
              이 기간에 매출이 없어요.
            </p>
          </div>
        ) : (
          <div className="bg-cream-light border border-greige rounded-2xl overflow-hidden">
            {byMenu.map((m, i) => {
              const ratio = totalRevenue > 0 ? (m.revenue / totalRevenue) * 100 : 0
              return (
                <div
                  key={m.name}
                  className={`p-4 ${i > 0 ? 'border-t border-greige' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        {m.category === 'quick'
                          ? '간단매출'
                          : (CATEGORY_LABEL[m.category] ?? m.category)}
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

      {byCategory.length > 1 && (
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-3">
            카테고리 분포
          </h2>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-2">
            {byCategory.map((c) => {
              const ratio = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-deepbrown">
                      {c.category === 'quick'
                        ? '간단매출'
                        : (CATEGORY_LABEL[c.category] ?? c.category)}
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

      <p className="text-[11px] font-light text-muted text-center pt-4">
        * 매출은 <span className="font-semibold">시술 완료</span> 처리된 예약 + 간단매출 합산이에요.
      </p>
    </>
  )
}
