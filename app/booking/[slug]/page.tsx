'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MyBookingsModal from './my-bookings-modal'

const CATEGORIES = [
  { key: 'eyebrow', label: '눈썹문신', icon: '✏️' },
  { key: 'lip', label: '입술문신', icon: '💋' },
  { key: 'eyelash', label: '속눈썹펌', icon: '🌿' },
  { key: 'retouch', label: '리터치', icon: '🔁' },
  { key: 'removal', label: '제거/커버업', icon: '🧽' },
  { key: 'other', label: '기타', icon: '✨' },
] as const

type Salon = {
  id: string
  name: string
  slug: string
  brand: { tagline?: string; intro?: string } | null
}

type Menu = {
  id: string
  category: string
  name: string
  price: number
  duration_minutes: number
  deposit_amount: number | null
  description: string | null
  is_active: boolean
  sort_order: number
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showMyBookings, setShowMyBookings] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: salonData } = await supabase
        .from('salons')
        .select('id, name, slug, brand')
        .eq('slug', slug)
        .maybeSingle()

      if (!salonData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setSalon(salonData as Salon)

      const { data: menusData } = await supabase
        .from('menus')
        .select(
          'id, category, name, price, duration_minutes, deposit_amount, description, is_active, sort_order'
        )
        .eq('salon_id', salonData.id)
        .eq('is_active', true)
        .order('category')
        .order('sort_order')

      setMenus((menusData ?? []) as Menu[])
      setLoading(false)
    }
    load()
  }, [slug])

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: menus.filter((m) => m.category === c.key),
  })).filter((g) => g.items.length > 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light text-muted">불러오는 중...</p>
      </div>
    )
  }

  if (notFound || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="font-bold text-deepbrown tracking-tight mb-1">
            매장을 찾을 수 없어요
          </p>
          <p className="text-sm font-light text-muted">
            예약 링크가 정확한지 확인해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 매장 브랜드 헤더 */}
      <header className="bg-cream-light border-b border-greige relative">
        <button
          type="button"
          onClick={() => setShowMyBookings(true)}
          className="absolute top-4 right-4 sm:top-5 sm:right-6 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-greige text-deepbrown hover:bg-nude transition"
        >
          📋 내 예약 조회
        </button>
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <h1 className="font-display font-bold text-3xl tracking-tight text-deepbrown mb-2">
            {salon.name}
          </h1>
          {salon.brand?.tagline && (
            <p className="text-sm font-light text-muted">
              {salon.brand.tagline}
            </p>
          )}
          {salon.brand?.intro && (
            <p className="text-sm font-light text-muted mt-3 leading-relaxed whitespace-pre-line">
              {salon.brand.intro}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-1">
            시술 메뉴
          </h2>
          <p className="text-xs font-light text-muted">
            원하는 메뉴를 선택해서 예약을 진행하세요.
          </p>
        </div>

        {grouped.length === 0 && (
          <div className="bg-cream-light border border-greige rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-bold text-deepbrown tracking-tight mb-1">
              아직 등록된 메뉴가 없어요
            </p>
            <p className="text-sm font-light text-muted">
              매장에 문의해주세요.
            </p>
          </div>
        )}

        {grouped.map((group) => (
          <section key={group.key}>
            <div className="flex items-baseline gap-2.5 mb-4 pb-2 border-b border-greige">
              <span className="text-xl">{group.icon}</span>
              <h3 className="font-display font-bold text-lg tracking-tight text-deepbrown">
                {group.label}
              </h3>
            </div>
            <div className="space-y-3">
              {group.items.map((m) => (
                <article
                  key={m.id}
                  className="bg-cream-light border border-greige rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-deepbrown tracking-tight">
                      {m.name}
                    </h4>
                    <span className="font-display font-bold text-deepbrown whitespace-nowrap">
                      {m.price.toLocaleString()}원
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-sm font-light text-muted mb-3 leading-relaxed whitespace-pre-line">
                      {m.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs font-light text-muted mb-4">
                    <span>⏱ {m.duration_minutes}분</span>
                    {(m.deposit_amount ?? 0) > 0 && (
                      <span>💰 예약금 {m.deposit_amount?.toLocaleString()}원</span>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      router.push(`/booking/${slug}/new?menu=${m.id}`)
                    }
                    className="w-full btn-primary py-2.5 rounded-lg text-sm font-semibold"
                  >
                    예약하기
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-greige mt-12">
        <div className="max-w-2xl mx-auto px-6 py-6 text-center">
          <p className="text-[11px] font-light text-muted">
            Powered by{' '}
            <span className="font-display font-semibold tracking-tight">
              BrowChart
            </span>
          </p>
        </div>
      </footer>

      {showMyBookings && (
        <MyBookingsModal
          slug={slug}
          onClose={() => setShowMyBookings(false)}
        />
      )}
    </div>
  )
}
