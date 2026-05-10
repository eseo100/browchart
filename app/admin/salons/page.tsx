'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SalonRow = {
  id: string
  name: string
  slug: string
  created_at: string
  owner_id: string | null
  // 집계
  customer_count?: number
  booking_count?: number
  last_booking_at?: string | null
  owner_name?: string | null
}

export default function AdminSalonsPage() {
  const [rows, setRows] = useState<SalonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      // 1. 모든 매장
      const { data: salons } = await supabase
        .from('salons')
        .select('id, name, slug, created_at, owner_id')
        .order('created_at', { ascending: false })

      const salonList = (salons ?? []) as SalonRow[]
      if (salonList.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      // 2. 매장별 집계 + 운영자 이름
      const enriched = await Promise.all(
        salonList.map(async (s) => {
          const [
            { count: customerCount },
            { count: bookingCount },
            { data: lastBooking },
            { data: ownerProfile },
          ] = await Promise.all([
            supabase
              .from('customers')
              .select('id', { count: 'exact', head: true })
              .eq('salon_id', s.id),
            supabase
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .eq('salon_id', s.id),
            supabase
              .from('bookings')
              .select('created_at')
              .eq('salon_id', s.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            s.owner_id
              ? supabase
                  .from('profiles')
                  .select('name')
                  .eq('id', s.owner_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ])
          return {
            ...s,
            customer_count: customerCount ?? 0,
            booking_count: bookingCount ?? 0,
            last_booking_at: lastBooking?.created_at ?? null,
            owner_name: ownerProfile?.name ?? null,
          }
        })
      )

      setRows(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.owner_name ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <div className="min-h-screen">
      <header className="border-b border-deepbrown bg-deepbrown text-nude">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm font-medium text-nude/80 hover:text-nude"
          >
            ← Admin
          </Link>
          <span className="font-display font-bold text-lg tracking-tight">
            매장 관리
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="매장명 / 링크 / 운영자명 검색"
            className="flex-1 max-w-md px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
          />
          <p className="text-xs font-light text-muted">
            총 {rows.length}개 매장 등록됨
          </p>
        </div>

        {loading && (
          <p className="text-sm font-light text-muted">불러오는 중...</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-cream-light border border-greige rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">🏪</p>
            <p className="font-bold text-deepbrown tracking-tight mb-1">
              {search ? '검색 결과 없음' : '아직 등록된 매장이 없어요'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const lastDays = r.last_booking_at
              ? Math.floor(
                  (Date.now() - new Date(r.last_booking_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null
            const active =
              lastDays !== null && lastDays <= 14
            return (
              <article
                key={r.id}
                className="bg-cream-light border border-greige rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-display text-[10px] font-semibold text-muted tracking-wider mb-0.5">
                      /booking/{r.slug}
                    </p>
                    <h3 className="font-bold text-deepbrown tracking-tight truncate">
                      {r.name}
                    </h3>
                    {r.owner_name && (
                      <p className="text-xs font-light text-muted mt-0.5">
                        {r.owner_name}님
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      active
                        ? 'bg-warmbrown text-nude'
                        : 'bg-greige text-muted'
                    }`}
                  >
                    {active ? '활성' : '비활성'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-greige/60">
                  <div>
                    <p className="text-[10px] font-light text-muted">고객</p>
                    <p className="font-bold text-sm text-deepbrown">
                      {r.customer_count}명
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-light text-muted">예약</p>
                    <p className="font-bold text-sm text-deepbrown">
                      {r.booking_count}건
                    </p>
                  </div>
                </div>

                <p className="text-[11px] font-light text-muted mt-3">
                  가입{' '}
                  {new Date(r.created_at).toLocaleDateString('ko-KR', {
                    year: '2-digit',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · 마지막 예약{' '}
                  {lastDays === null
                    ? '없음'
                    : lastDays === 0
                      ? '오늘'
                      : `${lastDays}일 전`}
                </p>

                <div className="flex gap-2 mt-3 pt-3 border-t border-greige/60">
                  <a
                    href={`/booking/${r.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2 rounded-lg text-xs font-semibold border border-greige text-deepbrown hover:bg-nude transition"
                  >
                    예약 페이지 ↗
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
