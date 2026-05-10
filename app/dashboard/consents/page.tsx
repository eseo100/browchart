'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ConsentRow = {
  id: string
  template_key: string | null
  title: string
  signed_name: string
  signed_at: string
  signature: string
  customer_id: string | null
  booking_id: string | null
  customer: { name: string | null; phone: string; customer_number: number | null } | null
  booking: {
    desired_date: string | null
    desired_time: string | null
    menu: { name: string; category: string } | null
  } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  eyebrow_default: '눈썹문신',
  lip_default: '입술문신',
  eyelash_default: '속눈썹펌',
}

function formatPhone(p: string) {
  const digits = p.replace(/\D/g, '')
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return p
}

export default function ConsentsPage() {
  const [consents, setConsents] = useState<ConsentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

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
        .from('consents')
        .select(
          `id, template_key, title, signed_name, signed_at, signature,
           customer_id, booking_id,
           customer:customers(name, phone, customer_number),
           booking:bookings(desired_date, desired_time, menu:menus(name, category))`
        )
        .eq('salon_id', salon.id)
        .order('signed_at', { ascending: false })

      setConsents((data as unknown as ConsentRow[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let arr = consents
    if (filter !== 'all') {
      arr = arr.filter((c) => c.template_key === filter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter((c) => {
        const name = (c.customer?.name ?? c.signed_name ?? '').toLowerCase()
        const phone = c.customer?.phone ?? ''
        return name.includes(q) || phone.includes(q)
      })
    }
    return arr
  }, [consents, search, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: consents.length }
    for (const k of Object.keys(CATEGORY_LABELS)) {
      c[k] = consents.filter((x) => x.template_key === k).length
    }
    return c
  }, [consents])

  const filterOptions = [
    { key: 'all', label: '전체' },
    ...Object.entries(CATEGORY_LABELS).map(([k, label]) => ({
      key: k,
      label,
    })),
  ]

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
            동의서
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {/* 검색 + 필터 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="고객 이름 / 전화번호로 검색"
            className="flex-1 px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-full border transition ${
                filter === opt.key
                  ? 'bg-warmbrown text-nude border-warmbrown'
                  : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
              }`}
            >
              {opt.label}{' '}
              <span
                className={`ml-1 ${
                  filter === opt.key ? 'opacity-80' : 'text-muted'
                }`}
              >
                {counts[opt.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-sm font-light text-muted">불러오는 중...</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-cream-light border border-greige rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">✍️</p>
            <p className="font-bold text-deepbrown tracking-tight mb-1">
              {search || filter !== 'all'
                ? '해당하는 동의서가 없어요'
                : '아직 작성된 동의서가 없어요'}
            </p>
            <p className="text-sm font-light text-muted">
              고객 모드에서 손님이 직접 서명해요.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((c) => {
            const cat = c.template_key
              ? CATEGORY_LABELS[c.template_key]
              : null
            return (
              <details
                key={c.id}
                className="bg-cream-light border border-greige rounded-2xl overflow-hidden"
              >
                <summary className="px-5 py-4 cursor-pointer hover:bg-nude/40 transition list-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {cat && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warmbrown/15 text-deepbrown">
                            {cat}
                          </span>
                        )}
                        {c.customer?.customer_number != null && (
                          <span className="font-display text-[10px] font-semibold text-warmbrown tracking-wider">
                            #{c.customer.customer_number}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-deepbrown tracking-tight">
                        {c.customer?.name ?? c.signed_name}
                        {c.customer && (
                          <span className="font-light text-xs text-muted ml-2">
                            · {formatPhone(c.customer.phone)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-light text-muted mt-0.5 truncate">
                        {c.title}
                        {c.booking?.menu?.name && (
                          <> · {c.booking.menu.name}</>
                        )}
                      </p>
                    </div>
                    <p className="font-display font-semibold text-sm text-deepbrown shrink-0">
                      {new Date(c.signed_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </summary>

                {/* 펼쳐보기 */}
                <div className="border-t border-greige bg-white p-5 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                      동의서 제목
                    </p>
                    <p className="font-bold text-deepbrown text-sm">
                      {c.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                      서명자
                    </p>
                    <p className="text-sm text-deepbrown">{c.signed_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                      서명 일시
                    </p>
                    <p className="text-sm text-deepbrown">
                      {new Date(c.signed_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  {c.booking?.desired_date && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                        예약 일시
                      </p>
                      <p className="text-sm text-deepbrown">
                        {c.booking.desired_date}
                        {c.booking.desired_time &&
                          ` ${c.booking.desired_time.slice(0, 5)}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                      서명
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.signature}
                      alt="서명"
                      className="bg-white border border-greige rounded-lg w-full max-w-md"
                    />
                  </div>
                  {c.customer_id && (
                    <Link
                      href={`/dashboard/customers/${c.customer_id}`}
                      className="inline-block text-xs font-semibold text-deepbrown underline hover:text-warmbrown"
                    >
                      → 이 손님 차트 보기
                    </Link>
                  )}
                </div>
              </details>
            )
          })}
        </div>

        {/* 안내 */}
        <div className="bg-cream-light border border-dashed border-greige rounded-2xl p-5 text-center">
          <p className="text-xs font-light text-muted">
            💡 매장별 커스텀 동의서 템플릿 편집은 다음 업데이트에서 추가될 예정이에요.
          </p>
        </div>
      </main>
    </div>
  )
}
