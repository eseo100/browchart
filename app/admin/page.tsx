'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Stats = {
  totalSalons: number
  totalCustomers: number
  totalBookings: number
  totalConsents: number
  todayBookings: number
  pendingBookings: number
  newSalonsLast7Days: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalSalons: 0,
    totalCustomers: 0,
    totalBookings: 0,
    totalConsents: 0,
    todayBookings: 0,
    pendingBookings: 0,
    newSalonsLast7Days: 0,
  })
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
      setAdminName(profile?.name ?? '운영자')

      const today = new Date().toISOString().slice(0, 10)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()

      const [
        { count: salonsCount },
        { count: customersCount },
        { count: bookingsCount },
        { count: consentsCount },
        { count: todayCount },
        { count: pendingCount },
        { count: newSalonsCount },
      ] = await Promise.all([
        supabase.from('salons').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('consents').select('id', { count: 'exact', head: true }),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('desired_date', today)
          .in('status', ['pending', 'confirmed']),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('salons')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
      ])

      setStats({
        totalSalons: salonsCount ?? 0,
        totalCustomers: customersCount ?? 0,
        totalBookings: bookingsCount ?? 0,
        totalConsents: consentsCount ?? 0,
        todayBookings: todayCount ?? 0,
        pendingBookings: pendingCount ?? 0,
        newSalonsLast7Days: newSalonsCount ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="min-h-screen">
      {/* 상단 바 */}
      <header className="border-b border-deepbrown bg-deepbrown text-nude">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-xl tracking-tight">
              BrowChart
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warmbrown text-nude">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-nude/80 hover:text-nude"
            >
              내 매장 ↗
            </Link>
            <span className="font-light text-nude/80 hidden sm:inline">
              {adminName}님
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-nude/80 hover:text-nude"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* 환영 */}
        <section>
          <p className="font-display text-xs font-semibold text-warmbrown uppercase tracking-[0.2em] mb-2">
            SaaS Admin
          </p>
          <h1 className="font-bold text-3xl tracking-tight text-deepbrown">
            플랫폼 전체 관제
          </h1>
          <p className="text-sm font-light text-muted mt-1.5">
            BrowChart에 가입한 모든 매장의 운영 상황을 확인할 수 있어요.
          </p>
        </section>

        {loading ? (
          <p className="text-sm font-light text-muted">통계 불러오는 중...</p>
        ) : (
          <>
            {/* 핵심 통계 (큰 카드) */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="총 매장" value={stats.totalSalons} hint={
                stats.newSalonsLast7Days > 0
                  ? `+${stats.newSalonsLast7Days} 최근 7일`
                  : undefined
              } />
              <StatCard label="총 고객" value={stats.totalCustomers} />
              <StatCard label="총 예약" value={stats.totalBookings} />
              <StatCard label="작성된 동의서" value={stats.totalConsents} />
            </section>

            {/* 운영 알림 */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`border rounded-2xl p-5 ${
                  stats.todayBookings > 0
                    ? 'bg-roselight/40 border-softpink'
                    : 'bg-cream-light border-greige'
                }`}
              >
                <p className="text-xs font-light text-muted">오늘 전체 예약</p>
                <p className="font-bold text-3xl tracking-tight text-deepbrown mt-1">
                  {stats.todayBookings}
                </p>
                <p className="text-[11px] font-light text-muted mt-1">
                  모든 매장 합산 (대기/확정만)
                </p>
              </div>
              <div className="bg-cream-light border border-greige rounded-2xl p-5">
                <p className="text-xs font-light text-muted">
                  플랫폼 전체 확인 대기
                </p>
                <p className="font-bold text-3xl tracking-tight text-deepbrown mt-1">
                  {stats.pendingBookings}
                </p>
                <p className="text-[11px] font-light text-muted mt-1">
                  사장님들이 아직 확정 안 한 예약
                </p>
              </div>
            </section>

            {/* 빠른 이동 */}
            <section>
              <h2 className="font-bold text-lg tracking-tight text-deepbrown mb-4">
                관리 메뉴
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Link
                  href="/admin/salons"
                  className="bg-cream-light border border-greige hover:border-warmbrown rounded-2xl p-5 transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl">🏪</span>
                  </div>
                  <h3 className="font-bold text-deepbrown tracking-tight mb-1">
                    매장 관리
                  </h3>
                  <p className="text-xs font-light text-muted leading-relaxed">
                    가입한 매장 목록·활성도·운영자 정보
                  </p>
                </Link>
                <div className="bg-cream-light border border-greige rounded-2xl p-5 opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl">📢</span>
                    <span className="text-[10px] font-semibold text-muted tracking-widest">
                      SOON
                    </span>
                  </div>
                  <h3 className="font-bold text-deepbrown tracking-tight mb-1">
                    공지사항
                  </h3>
                  <p className="text-xs font-light text-muted leading-relaxed">
                    모든 매장에 띄울 안내·업데이트 노트
                  </p>
                </div>
                <div className="bg-cream-light border border-greige rounded-2xl p-5 opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl">💳</span>
                    <span className="text-[10px] font-semibold text-muted tracking-widest">
                      SOON
                    </span>
                  </div>
                  <h3 className="font-bold text-deepbrown tracking-tight mb-1">
                    구독·결제
                  </h3>
                  <p className="text-xs font-light text-muted leading-relaxed">
                    매장별 구독 상태·MRR·결제 내역
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="bg-cream-light border border-greige rounded-2xl p-4">
      <p className="text-xs font-light text-muted">{label}</p>
      <p className="font-bold text-2xl tracking-tight text-deepbrown mt-1">
        {value.toLocaleString()}
      </p>
      {hint && (
        <p className="text-[11px] font-medium text-warmbrown mt-1">{hint}</p>
      )}
    </div>
  )
}
