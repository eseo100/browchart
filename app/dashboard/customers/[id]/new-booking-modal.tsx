'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Menu = {
  id: string
  category: string
  name: string
  price: number
  duration_minutes: number
  deposit_amount: number | null
  is_active: boolean
  sort_order: number
}

type Props = {
  salonId: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  onClose: () => void
  onCreated: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  eyebrow: '눈썹문신',
  lip: '입술문신',
  eyelash: '속눈썹펌',
  retouch: '리터치',
  removal: '제거/커버업',
  other: '기타',
}

export default function NewBookingModal({
  salonId,
  customerName,
  customerPhone,
  customerEmail,
  onClose,
  onCreated,
}: Props) {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [menuId, setMenuId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [memo, setMemo] = useState('')
  const [status, setStatus] = useState<'pending' | 'confirmed'>('confirmed')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('menus')
        .select(
          'id, category, name, price, duration_minutes, deposit_amount, is_active, sort_order'
        )
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('category')
        .order('sort_order')
      setMenus((data as Menu[]) ?? [])
      setLoadingMenus(false)
    }
    load()
  }, [salonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!menuId) {
      setError('메뉴를 선택해주세요.')
      return
    }
    setSaving(true)
    const menu = menus.find((m) => m.id === menuId)
    const accessToken =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

    const { error: insertError } = await supabase.from('bookings').insert({
      salon_id: salonId,
      menu_id: menuId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      consultation: { experience: 'before', memo: null },
      desired_date: date || null,
      desired_time: time || null,
      customer_memo: memo.trim() || null,
      status,
      deposit_amount: menu?.deposit_amount ?? 0,
      deposit_status:
        (menu?.deposit_amount ?? 0) > 0 ? 'unpaid' : 'waived',
      access_token: accessToken,
    })

    setSaving(false)
    if (insertError) {
      setError('예약 생성 실패: ' + insertError.message)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-nude rounded-3xl p-7 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4"
      >
        <div>
          <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
            📅 다음 예약 잡기
          </h3>
          <p className="text-xs font-light text-muted mt-1">
            {customerName} 손님의 예약을 직접 추가해요.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-deepbrown mb-1.5">
            메뉴 <span className="text-softpink">*</span>
          </label>
          {loadingMenus ? (
            <p className="text-xs font-light text-muted">메뉴 불러오는 중...</p>
          ) : (
            <select
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            >
              <option value="">선택하세요</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  [{CATEGORY_LABELS[m.category] ?? m.category}] {m.name} ·{' '}
                  {m.price.toLocaleString()}원 · {m.duration_minutes}분
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-medium text-deepbrown mb-1.5">
              시간
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-deepbrown mb-1.5">
            상태
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'confirmed', label: '✓ 확정' },
              { value: 'pending', label: '대기' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value as typeof status)}
                className={`py-2.5 text-sm font-semibold rounded-lg border transition ${
                  status === opt.value
                    ? 'bg-warmbrown text-nude border-warmbrown'
                    : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-deepbrown mb-1.5">
            메모 (선택)
          </label>
          <textarea
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="추가 요청, 특이사항 등"
            className="w-full px-3 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown resize-none"
          />
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
            {saving ? '저장 중...' : '예약 추가'}
          </button>
        </div>
      </form>
    </div>
  )
}
