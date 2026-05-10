'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import MenuFormModal, { type Menu, type MenuFormValues } from './menu-form'

const CATEGORIES = [
  { key: 'eyebrow', label: '눈썹문신', icon: '✏️' },
  { key: 'lip', label: '입술문신', icon: '💋' },
  { key: 'eyelash', label: '속눈썹펌', icon: '🌿' },
  { key: 'retouch', label: '리터치', icon: '🔁' },
  { key: 'removal', label: '제거/커버업', icon: '🧽' },
  { key: 'other', label: '기타', icon: '✨' },
] as const

export default function MenusPage() {
  const [salonId, setSalonId] = useState<string | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Menu | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
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
    const { data: menusData } = await supabase
      .from('menus')
      .select('*')
      .eq('salon_id', salon.id)
      .order('category')
      .order('sort_order')
      .order('created_at')

    setMenus(menusData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (values: MenuFormValues, id?: string) => {
    if (!salonId) return
    if (id) {
      const { error } = await supabase.from('menus').update(values).eq('id', id)
      if (error) {
        alert('수정 실패: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('menus')
        .insert({ ...values, salon_id: salonId })
      if (error) {
        alert('추가 실패: ' + error.message)
        return
      }
    }
    setEditing(null)
    setCreating(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 메뉴를 삭제할까요?\n예약에 연결된 적이 있다면 영구 삭제됩니다.')) {
      return
    }
    const { error } = await supabase.from('menus').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    load()
  }

  const toggleActive = async (menu: Menu) => {
    const { error } = await supabase
      .from('menus')
      .update({ is_active: !menu.is_active })
      .eq('id', menu.id)
    if (error) {
      alert('변경 실패: ' + error.message)
      return
    }
    load()
  }

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: menus.filter((m) => m.category === c.key),
  }))

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
              시술 메뉴
            </span>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + 메뉴 추가
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {loading && (
          <p className="text-sm font-light text-muted">불러오는 중...</p>
        )}

        {!loading && menus.length === 0 && (
          <div className="bg-cream-light border border-greige rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-bold text-deepbrown tracking-tight mb-1">
              아직 메뉴가 없어요
            </p>
            <p className="text-sm font-light text-muted mb-5">
              자연눈썹, 콤보눈썹, 입술문신 등 시술 메뉴를 추가하세요.
              <br />
              메뉴는 손님 예약 페이지에서 보입니다.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold"
            >
              첫 메뉴 추가
            </button>
          </div>
        )}

        {!loading &&
          menus.length > 0 &&
          grouped.map((group) => (
            <section key={group.key}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-greige">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl">{group.icon}</span>
                  <h2 className="font-display font-bold text-2xl tracking-tight text-deepbrown">
                    {group.label}
                  </h2>
                  <span className="text-xs font-light text-muted">
                    {group.items.length}개
                  </span>
                </div>
                <button
                  onClick={() => setCreating(true)}
                  className="text-xs font-semibold text-muted hover:text-deepbrown transition"
                >
                  + 추가
                </button>
              </div>
              {group.items.length === 0 ? (
                <p className="text-sm font-light text-muted py-2 mb-2">
                  아직 등록된 {group.label} 메뉴가 없어요.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.items.map((m) => (
                      <article
                        key={m.id}
                        className={`bg-cream-light border rounded-2xl p-4 transition ${
                          m.is_active
                            ? 'border-greige'
                            : 'border-greige opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-deepbrown tracking-tight">
                            {m.name}
                          </h3>
                          {!m.is_active && (
                            <span className="text-[10px] font-semibold text-muted px-2 py-0.5 bg-greige rounded-full">
                              비활성
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs font-light text-muted mb-3">
                          <p>
                            가격{' '}
                            <span className="font-medium text-deepbrown">
                              {m.price.toLocaleString()}원
                            </span>
                          </p>
                          <p>
                            소요시간{' '}
                            <span className="font-medium text-deepbrown">
                              {m.duration_minutes}분
                            </span>
                          </p>
                          {(m.deposit_amount ?? 0) > 0 && (
                            <p>
                              예약금{' '}
                              <span className="font-medium text-deepbrown">
                                {m.deposit_amount?.toLocaleString()}원
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setEditing(m)}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-greige text-deepbrown hover:bg-nude transition"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => toggleActive(m)}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-greige text-deepbrown hover:bg-nude transition"
                          >
                            {m.is_active ? '숨기기' : '보이기'}
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-greige text-muted hover:text-deepbrown hover:bg-nude transition"
                          >
                            🗑
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
              )}
            </section>
          ))}
      </main>

      {(creating || editing) && (
        <MenuFormModal
          menu={editing ?? undefined}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
