'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCustomerGrade, GRADE_STYLE } from '@/lib/customer-grade'

type Customer = {
  id: string
  phone: string
  name: string | null
  customer_number: number | null
  tags: string[] | null
  total_visits: number
  last_visit_at: string | null
  next_retouch_date: string | null
}

type SortKey = 'recent' | 'visits' | 'retouch' | 'name'

function formatPhone(p: string) {
  const digits = p.replace(/\D/g, '')
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return p
}

function formatNumber(n: number | null) {
  if (n == null) return ''
  return '#' + n
}

function relativeDate(d: string | null) {
  if (!d) return '-'
  const target = new Date(d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  if (diff === -1) return '어제'
  if (diff > 0 && diff <= 14) return `${diff}일 후`
  if (diff < 0 && diff >= -14) return `${-diff}일 전`
  return target.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salonId, setSalonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [addOpen, setAddOpen] = useState(false)

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
    setSalonId(salon.id)

    const { data } = await supabase
      .from('customers')
      .select(
        'id, phone, name, customer_number, tags, total_visits, last_visit_at, next_retouch_date'
      )
      .eq('salon_id', salon.id)

    setCustomers((data as Customer[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let arr = customers
    if (q) {
      arr = customers.filter(
        (c) =>
          (c.name ?? '').toLowerCase().includes(q) || c.phone.includes(q)
      )
    }
    return [...arr].sort((a, b) => {
      switch (sort) {
        case 'visits':
          return b.total_visits - a.total_visits
        case 'retouch':
          // 가까운 리터치 먼저 (null 뒤로)
          if (!a.next_retouch_date && !b.next_retouch_date) return 0
          if (!a.next_retouch_date) return 1
          if (!b.next_retouch_date) return -1
          return a.next_retouch_date.localeCompare(b.next_retouch_date)
        case 'name':
          return (a.name ?? '').localeCompare(b.name ?? '')
        case 'recent':
        default:
          if (!a.last_visit_at && !b.last_visit_at) return 0
          if (!a.last_visit_at) return 1
          if (!b.last_visit_at) return -1
          return b.last_visit_at.localeCompare(a.last_visit_at)
      }
    })
  }, [customers, search, sort])

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'recent', label: '최근 방문순' },
    { key: 'visits', label: '방문 많은순' },
    { key: 'retouch', label: '리터치 임박순' },
    { key: 'name', label: '이름순' },
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b border-greige bg-cream-light">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
              고객 관리
            </span>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + 고객 추가
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {/* 검색 + 정렬 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 / 전화번호(뒷자리도 OK)로 검색"
            className="flex-1 px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
          />
          <div className="flex gap-2 flex-wrap">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                  sort === opt.key
                    ? 'bg-warmbrown text-nude border-warmbrown'
                    : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs font-light text-muted">
          총 {customers.length}명의 고객
          {search && filtered.length !== customers.length && (
            <> · 검색 결과 {filtered.length}명</>
          )}
        </p>

        {loading && (
          <p className="text-sm font-light text-muted">불러오는 중...</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-cream-light border border-greige rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">👥</p>
            <p className="font-bold text-deepbrown tracking-tight mb-1">
              {search ? '검색 결과가 없어요' : '아직 고객이 없어요'}
            </p>
            <p className="text-sm font-light text-muted">
              {search
                ? '다른 검색어로 시도해보세요.'
                : '예약이 들어오면 자동으로 고객으로 등록돼요.'}
            </p>
          </div>
        )}

        {addOpen && salonId && (
          <AddCustomerModal
            salonId={salonId}
            onClose={() => setAddOpen(false)}
            onAdded={() => {
              setAddOpen(false)
              load()
            }}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const retouchDate = c.next_retouch_date
              ? new Date(c.next_retouch_date)
              : null
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const retouchSoon =
              retouchDate &&
              retouchDate.getTime() - today.getTime() <=
                7 * 24 * 60 * 60 * 1000 &&
              retouchDate.getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000

            return (
              <Link
                key={c.id}
                href={`/dashboard/customers/${c.id}`}
                className="bg-cream-light border border-greige hover:border-warmbrown rounded-2xl p-4 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {c.customer_number != null && (
                        <span className="font-display text-[10px] font-semibold text-warmbrown tracking-wider">
                          {formatNumber(c.customer_number)}
                        </span>
                      )}
                      {(() => {
                        const grade = getCustomerGrade(c.total_visits)
                        return (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${GRADE_STYLE[grade]}`}
                          >
                            {grade}
                          </span>
                        )
                      })()}
                    </div>
                    <p className="font-bold text-deepbrown tracking-tight truncate">
                      {c.name ?? '이름 없음'}
                    </p>
                    <p className="text-xs font-light text-muted mt-0.5">
                      {formatPhone(c.phone)}
                    </p>
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-roselight text-deepbrown"
                          >
                            🏷 {t}
                          </span>
                        ))}
                        {c.tags.length > 3 && (
                          <span className="text-[9px] font-light text-muted">
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="bg-white border border-greige rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-deepbrown shrink-0">
                    {c.total_visits}회
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-light text-muted pt-2 border-t border-greige/60">
                  <span>최근 {relativeDate(c.last_visit_at)}</span>
                  {c.next_retouch_date && (
                    <span
                      className={
                        retouchSoon
                          ? 'font-medium text-softpink'
                          : ''
                      }
                    >
                      🔁 리터치 {relativeDate(c.next_retouch_date)}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}

/* ─────────── 고객 직접 추가 모달 ─────────── */
function AddCustomerModal({
  salonId,
  onClose,
  onAdded,
}: {
  salonId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    if (!phone.replace(/\D/g, '')) {
      setError('전화번호를 입력해주세요.')
      return
    }
    setSaving(true)
    const { error: insertError } = await supabase.from('customers').insert({
      salon_id: salonId,
      name: name.trim(),
      phone: phone.trim(),
      birth_date: birthDate || null,
      email: email.trim() || null,
    })
    setSaving(false)
    if (insertError) {
      if (insertError.code === '23505') {
        setError('이 전화번호로 이미 등록된 고객이 있어요.')
      } else {
        setError('저장 실패: ' + insertError.message)
      }
      return
    }
    onAdded()
  }

  return (
    <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <form
        onSubmit={handleSave}
        className="bg-nude rounded-3xl p-7 w-full max-w-md space-y-4"
      >
        <div>
          <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
            + 고객 추가
          </h3>
          <p className="text-xs font-light text-muted mt-1">
            워크인/전화 예약 등 시스템 외부 손님을 등록해요.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-deepbrown mb-1.5">
            이름 <span className="text-softpink">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="w-full px-3 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-deepbrown mb-1.5">
            전화번호 <span className="text-softpink">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            className="w-full px-3 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
          />
          <p className="text-[10px] font-light text-muted mt-1">
            * 같은 전화번호로 이미 등록된 손님이 있으면 추가가 안돼요.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              생일 (선택)
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              이메일 (선택)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-3 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
        </div>
        {error && (
          <p className="text-sm font-medium text-softpink">{error}</p>
        )}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '추가'}
          </button>
        </div>
      </form>
    </div>
  )
}
