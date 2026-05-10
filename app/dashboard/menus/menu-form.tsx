'use client'

import { useState, useEffect } from 'react'

export type Menu = {
  id: string
  salon_id: string
  category: 'eyebrow' | 'lip' | 'eyelash' | 'retouch' | 'removal' | 'other'
  name: string
  price: number
  duration_minutes: number
  deposit_amount: number | null
  description: string | null
  precautions: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type MenuFormValues = {
  category: Menu['category']
  name: string
  price: number
  duration_minutes: number
  deposit_amount: number
  description: string
  precautions: string
  is_active: boolean
}

const CATEGORIES: { key: Menu['category']; label: string }[] = [
  { key: 'eyebrow', label: '눈썹문신' },
  { key: 'lip', label: '입술문신' },
  { key: 'eyelash', label: '속눈썹펌' },
  { key: 'retouch', label: '리터치' },
  { key: 'removal', label: '제거/커버업' },
  { key: 'other', label: '기타' },
]

type Props = {
  menu?: Menu
  onClose: () => void
  onSave: (values: MenuFormValues, id?: string) => Promise<void>
}

export default function MenuFormModal({ menu, onClose, onSave }: Props) {
  const [category, setCategory] = useState<Menu['category']>(
    menu?.category ?? 'eyebrow'
  )
  const [name, setName] = useState(menu?.name ?? '')
  const [price, setPrice] = useState<string>(menu?.price.toString() ?? '')
  const [duration, setDuration] = useState<string>(
    menu?.duration_minutes.toString() ?? '90'
  )
  const [deposit, setDeposit] = useState<string>(
    menu?.deposit_amount?.toString() ?? ''
  )
  const [description, setDescription] = useState(menu?.description ?? '')
  const [precautions, setPrecautions] = useState(menu?.precautions ?? '')
  const [isActive, setIsActive] = useState(menu?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async () => {
    if (!name.trim()) return alert('메뉴명을 입력해주세요')
    const priceNum = Number(price.replace(/,/g, '')) || 0
    const durationNum = Number(duration) || 0
    const depositNum = Number(deposit.replace(/,/g, '')) || 0
    if (priceNum < 0) return alert('가격은 0 이상이어야 해요')
    if (durationNum <= 0) return alert('소요시간을 입력해주세요')

    setSaving(true)
    await onSave(
      {
        category,
        name: name.trim(),
        price: priceNum,
        duration_minutes: durationNum,
        deposit_amount: depositNum,
        description: description.trim(),
        precautions: precautions.trim(),
        is_active: isActive,
      },
      menu?.id
    )
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepbrown/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-nude w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-greige"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-nude border-b border-greige px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg tracking-tight text-deepbrown">
            {menu ? '메뉴 수정' : '메뉴 추가'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-deepbrown text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              카테고리
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition ${
                    category === c.key
                      ? 'bg-warmbrown text-nude border-warmbrown'
                      : 'bg-cream-light text-deepbrown border-greige hover:border-warmbrown'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              메뉴명
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 자연 눈썹문신"
              className="w-full bg-cream-light border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1.5">
                가격 (원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="300000"
                className="w-full bg-cream-light border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1.5">
                소요시간 (분)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="90"
                className="w-full bg-cream-light border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              예약금 (원){' '}
              <span className="font-light text-muted">— 0이면 받지 않음</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={deposit}
              onChange={(e) =>
                setDeposit(e.target.value.replace(/[^0-9]/g, ''))
              }
              placeholder="50000"
              className="w-full bg-cream-light border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              설명{' '}
              <span className="font-light text-muted">— 손님 예약 페이지 노출</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="자연스러운 결 표현, 부담 없는 일상 메이크업"
              className="w-full bg-cream-light border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              주의사항
            </label>
            <textarea
              value={precautions}
              onChange={(e) => setPrecautions(e.target.value)}
              rows={2}
              placeholder="시술 전 음주, 사우나, 피부과 시술 금지"
              className="w-full bg-cream-light border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-warmbrown"
            />
            <span className="text-sm font-medium text-deepbrown">
              예약 페이지에 노출
            </span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-nude border-t border-greige px-6 py-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-greige text-deepbrown text-sm font-semibold hover:bg-cream-light transition"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg btn-primary text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : menu ? '수정 완료' : '추가하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
