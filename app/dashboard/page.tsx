'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CalendarView from './calendar-view'

type DayHours = { open: number; close: number; closed: boolean }

type SalonInfo = {
  id: string
  name: string
  slug: string
  business_hours?: DayHours[] | null
  closed_dates?: string[] | null
}

type ProfileInfo = {
  name: string | null
  role?: string | null
}

type BookingStats = {
  today: number
  thisWeek: number
  pending: number
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function endOfWeekStr() {
  const d = new Date()
  // 이번 주 일요일 (KST 기준 단순 계산)
  const dow = d.getDay()
  const daysToSunday = 7 - dow
  d.setDate(d.getDate() + daysToSunday)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [salon, setSalon] = useState<SalonInfo | null>(null)
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [stats, setStats] = useState<BookingStats>({
    today: 0,
    thisWeek: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { data: salonData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('name, role')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('salons')
          .select('id, name, slug, business_hours, closed_dates')
          .eq('owner_id', user.id)
          .maybeSingle(),
      ])

      setProfile(profileData)
      setSalon(salonData)

      if (salonData) {
        const today = todayStr()
        const weekEnd = endOfWeekStr()
        const [todayQ, weekQ, pendingQ] = await Promise.all([
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('salon_id', salonData.id)
            .eq('desired_date', today)
            .in('status', ['pending', 'confirmed']),
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('salon_id', salonData.id)
            .gte('desired_date', today)
            .lte('desired_date', weekEnd)
            .in('status', ['pending', 'confirmed']),
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('salon_id', salonData.id)
            .eq('status', 'pending'),
        ])
        setStats({
          today: todayQ.count ?? 0,
          thisWeek: weekQ.count ?? 0,
          pending: pendingQ.count ?? 0,
        })
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light text-muted">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 상단 바 */}
      <header className="border-b border-greige bg-cream-light">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <span className="font-display font-bold text-xl tracking-tight text-deepbrown">
              BrowChart
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {profile?.role === 'super_admin' && (
              <Link
                href="/admin"
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-deepbrown text-nude hover:opacity-90 transition"
              >
                ⚙ ADMIN
              </Link>
            )}
            <span className="font-light text-muted hidden sm:inline">
              {profile?.name ?? '원장'}님
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-muted hover:text-deepbrown"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* 환영 */}
        <section>
          <p className="font-display text-xs font-semibold text-softpink uppercase tracking-[0.2em] mb-2">
            Dashboard
          </p>
          <h1 className="font-bold text-3xl tracking-tight text-deepbrown">
            {salon?.name ?? '내 매장'}
          </h1>
          {salon && (
            <p className="text-xs font-light text-muted mt-2">
              예약 링크·QR은{' '}
              <Link
                href="/dashboard/settings"
                className="font-semibold text-deepbrown underline"
              >
                매장 설정
              </Link>
              에서 확인하세요.
            </p>
          )}
        </section>

        {/* 빠른 통계 */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            href="/dashboard/bookings"
            className="bg-cream-light border border-greige hover:border-warmbrown rounded-2xl p-4 transition"
          >
            <p className="text-xs font-light text-muted">오늘 예약</p>
            <p className="font-bold text-2xl tracking-tight text-deepbrown mt-1">
              {stats.today}
            </p>
          </Link>
          <Link
            href="/dashboard/bookings"
            className="bg-cream-light border border-greige hover:border-warmbrown rounded-2xl p-4 transition"
          >
            <p className="text-xs font-light text-muted">이번 주 예약</p>
            <p className="font-bold text-2xl tracking-tight text-deepbrown mt-1">
              {stats.thisWeek}
            </p>
          </Link>
          <Link
            href="/dashboard/bookings"
            className={`border rounded-2xl p-4 transition ${
              stats.pending > 0
                ? 'bg-roselight border-softpink hover:border-warmbrown'
                : 'bg-cream-light border-greige hover:border-warmbrown'
            }`}
          >
            <p className="text-xs font-light text-muted">확인 대기</p>
            <p className="font-bold text-2xl tracking-tight text-deepbrown mt-1">
              {stats.pending}
            </p>
          </Link>
        </section>

        {/* 월 캘린더 + 선택일 타임테이블 */}
        {salon && (
          <CalendarView
            salonId={salon.id}
            businessHours={salon.business_hours ?? null}
            closedDates={salon.closed_dates ?? []}
          />
        )}

        {/* 주요 기능 카드 */}
        <section>
          <h2 className="font-bold text-lg tracking-tight text-deepbrown mb-4">
            주요 메뉴
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {menus.map((m) => {
              const inner = (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl">{m.icon}</span>
                    {!m.href && (
                      <span className="text-[10px] font-semibold text-muted tracking-widest">
                        SOON
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-deepbrown tracking-tight mb-1">
                    {m.title}
                  </h3>
                  <p className="text-xs font-light text-muted leading-relaxed">
                    {m.desc}
                  </p>
                </>
              )
              return m.href ? (
                <Link
                  key={m.title}
                  href={m.href}
                  className="bg-cream-light border border-greige hover:border-warmbrown rounded-2xl p-5 transition"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={m.title}
                  className="bg-cream-light border border-greige rounded-2xl p-5 opacity-60"
                >
                  {inner}
                </div>
              )
            })}
          </div>
        </section>

        {/* 안내 */}
        <section className="bg-roselight border border-softpink rounded-2xl p-5 text-sm">
          <p className="font-bold text-deepbrown mb-1.5 tracking-tight">
            🎉 매장이 만들어졌어요!
          </p>
          <p className="font-light text-deepbrown leading-relaxed">
            지금은 기본 셋업만 완료된 상태예요. 다음 작업으로 시술 메뉴 등록 → 예약
            받기 → 고객 차트 작성이 추가될 예정입니다.
          </p>
        </section>
      </main>
    </div>
  )
}

type DashboardMenu = {
  icon: string
  title: string
  desc: string
  href?: string
}

const menus: DashboardMenu[] = [
  {
    icon: '📅',
    title: '예약 관리',
    desc: '들어온 예약 확인·확정·입금 체크',
    href: '/dashboard/bookings',
  },
  {
    icon: '👥',
    title: '고객 관리',
    desc: '손님 차트, 시술 이력, 사진',
    href: '/dashboard/customers',
  },
  {
    icon: '✏️',
    title: '시술 메뉴',
    desc: '눈썹문신/입술/속눈썹 메뉴 관리',
    href: '/dashboard/menus',
  },
  {
    icon: '✍️',
    title: '동의서',
    desc: '작성된 동의서 모아보기 + 서명 확인',
    href: '/dashboard/consents',
  },
  { icon: '💬', title: '문자 발송', desc: '예약/시술 후 자동 안내' },
  {
    icon: '⚙️',
    title: '매장 설정',
    desc: '직원 PIN, 매장 정보, 영업시간',
    href: '/dashboard/settings',
  },
]
