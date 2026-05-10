'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import DateTimePicker from './datetime-picker'

const CATEGORY_LABELS: Record<string, string> = {
  eyebrow: '눈썹문신',
  lip: '입술문신',
  eyelash: '속눈썹펌',
  retouch: '리터치',
  removal: '제거/커버업',
  other: '기타',
}


type DayHours = { open: number; close: number; closed: boolean }

type Salon = {
  id: string
  name: string
  slug: string
  open_hour: number | null
  close_hour: number | null
  business_hours: DayHours[] | null
  closed_dates: string[] | null
}
type Menu = {
  id: string
  category: string
  name: string
  price: number
  duration_minutes: number
  deposit_amount: number | null
}

export default function BookingNewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const menuId = searchParams.get('menu')

  const [salon, setSalon] = useState<Salon | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 폼 상태
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [experience, setExperience] = useState<'first' | 'before' | 'retouch'>(
    'first'
  )
  const [memoConsult, setMemoConsult] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [memo, setMemo] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: salonData } = await supabase
        .from('salons')
        .select(
          'id, name, slug, open_hour, close_hour, business_hours, closed_dates'
        )
        .eq('slug', slug)
        .maybeSingle()

      if (!salonData) {
        setLoading(false)
        return
      }
      setSalon(salonData as Salon)

      if (menuId) {
        const { data: menuData } = await supabase
          .from('menus')
          .select('id, category, name, price, duration_minutes, deposit_amount')
          .eq('id', menuId)
          .eq('salon_id', salonData.id)
          .eq('is_active', true)
          .maybeSingle()
        setMenu((menuData as Menu) ?? null)
      }
      setLoading(false)
    }
    load()
  }, [slug, menuId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!salon || !menu) return
    if (!agreed) {
      setError('개인정보 수집 및 시술 안내에 동의해주세요.')
      return
    }

    setSubmitting(true)

    // 토큰을 클라이언트에서 생성 (anon은 insert 후 select 권한이 없으므로)
    const accessToken =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).slice(2) +
          Math.random().toString(36).slice(2)

    const { error: insertError } = await supabase.from('bookings').insert({
      salon_id: salon.id,
      menu_id: menu.id,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_email: email.trim() || null,
      consultation: {
        experience,
        memo: memoConsult.trim() || null,
      },
      desired_date: date || null,
      desired_time: time || null,
      customer_memo: memo.trim() || null,
      deposit_amount: menu.deposit_amount ?? 0,
      deposit_status:
        (menu.deposit_amount ?? 0) > 0 ? 'unpaid' : 'waived',
      access_token: accessToken,
    })

    if (insertError) {
      setError('예약 신청에 실패했어요: ' + insertError.message)
      console.error(insertError)
      setSubmitting(false)
      return
    }

    router.push(`/booking/${slug}/done?token=${accessToken}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light text-muted">불러오는 중...</p>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm font-light text-muted">매장을 찾을 수 없어요.</p>
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-bold text-deepbrown tracking-tight mb-3">
            메뉴 정보를 찾을 수 없어요
          </p>
          <Link
            href={`/booking/${slug}`}
            className="text-sm font-semibold text-deepbrown underline"
          >
            메뉴 다시 고르기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-cream-light border-b border-greige">
        <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href={`/booking/${slug}`}
            className="text-sm font-medium text-muted hover:text-deepbrown"
          >
            ← 돌아가기
          </Link>
          <span className="font-display font-semibold text-sm tracking-tight text-deepbrown">
            {salon.name}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <h1 className="font-display font-bold text-2xl tracking-tight text-deepbrown mb-6">
          예약 신청
        </h1>

        {/* 선택한 메뉴 표시 */}
        <section className="bg-cream-light border border-greige rounded-2xl p-5 mb-6">
          <p className="text-xs font-light text-muted mb-1">선택한 메뉴</p>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-light text-muted">
                {CATEGORY_LABELS[menu.category] ?? menu.category}
              </p>
              <h2 className="font-bold text-deepbrown tracking-tight">
                {menu.name}
              </h2>
            </div>
            <span className="font-display font-bold text-deepbrown whitespace-nowrap">
              {menu.price.toLocaleString()}원
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-light text-muted mt-3">
            <span>⏱ {menu.duration_minutes}분</span>
            {(menu.deposit_amount ?? 0) > 0 && (
              <span>💰 예약금 {menu.deposit_amount?.toLocaleString()}원</span>
            )}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 손님 정보 */}
          <section className="space-y-3">
            <h3 className="font-bold text-base tracking-tight text-deepbrown">
              👤 손님 정보
            </h3>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                이름 <span className="text-softpink">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                연락처 <span className="text-softpink">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
                placeholder="010-1234-5678"
              />
              <p className="text-[11px] font-light text-muted mt-1">
                예약 확인/안내 문자가 발송돼요.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                이메일 (선택)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
                placeholder="example@email.com"
              />
            </div>
          </section>

          {/* 상담 */}
          <section className="space-y-3">
            <h3 className="font-bold text-base tracking-tight text-deepbrown">
              💬 시술 경험
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'first', label: '처음이에요' },
                { value: 'before', label: '받아본 적 있어요' },
                { value: 'retouch', label: '리터치예요' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setExperience(opt.value as typeof experience)
                  }
                  className={`px-3 py-2.5 text-xs font-semibold rounded-lg border transition ${
                    experience === opt.value
                      ? 'bg-warmbrown text-nude border-warmbrown'
                      : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                상담 메모 (선택)
              </label>
              <textarea
                rows={3}
                value={memoConsult}
                onChange={(e) => setMemoConsult(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown resize-none"
                placeholder="원장님께 전하고 싶은 말을 자유롭게 적어주세요."
              />
            </div>
          </section>

          {/* 희망 일시 */}
          <section className="space-y-3">
            <h3 className="font-bold text-base tracking-tight text-deepbrown">
              📅 희망 일시
            </h3>
            <DateTimePicker
              date={date}
              time={time}
              salonId={salon.id}
              currentMenuDuration={menu.duration_minutes}
              businessHours={salon.business_hours}
              closedDates={salon.closed_dates ?? []}
              fallbackOpen={salon.open_hour ?? 10}
              fallbackClose={salon.close_hour ?? 19}
              onChange={(d, t) => {
                setDate(d)
                setTime(t)
              }}
            />
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                추가 요청 (선택)
              </label>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown resize-none"
                placeholder="가능한 시간대, 함께 받고 싶은 시술 등"
              />
            </div>
            <p className="text-[11px] font-light text-muted">
              * 희망 일시는 참고용이며, 원장님 확인 후 최종 확정돼요.
            </p>
          </section>

          {/* 동의 */}
          <section className="bg-cream-light border border-greige rounded-2xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-warmbrown"
              />
              <span className="text-xs font-light text-deepbrown leading-relaxed">
                <span className="font-semibold">
                  개인정보 수집 및 시술 안내에 동의합니다.
                </span>
                <br />
                예약 확인을 위해 이름/연락처가 매장에 전달되며, 시술 전후 안내
                문자를 받게 됩니다. 자세한 동의서는 시술 당일 작성해요.
              </span>
            </label>
          </section>

          {error && (
            <p className="text-sm font-medium text-softpink">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? '신청 중...' : '예약 신청하기'}
          </button>
        </form>
      </main>
    </div>
  )
}
