'use client'

import { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCustomerGrade, GRADE_STYLE, SUGGESTED_TAGS } from '@/lib/customer-grade'
import DrawingCanvas from './drawing-canvas'
import CustomerMode from './customer-mode'
import PinSetupModal from './pin-setup-modal'
import PhotoSection from './photo-section'
import NewBookingModal from './new-booking-modal'

type Customer = {
  id: string
  salon_id: string
  phone: string
  name: string | null
  customer_number: number | null
  email: string | null
  birth_date: string | null
  skin_type: string | null
  allergies: string | null
  allergies_tags: string[] | null
  allergies_drawing: string | null
  preferred_design: string | null
  design_tags: string[] | null
  design_drawing: string | null
  color_tags: string[] | null
  notes: string | null
  notes_drawing: string | null
  tags: string[] | null
  total_visits: number
  last_visit_at: string | null
  next_retouch_date: string | null
}

type BookingHistory = {
  id: string
  desired_date: string | null
  desired_time: string | null
  status: string
  customer_memo: string | null
  consultation: {
    experience?: string
    memo?: string | null
    skin_type?: string | null
    allergies?: string[]
    desired_designs?: string[]
    desired_colors?: string[]
  } | null
  menu: { name: string; price: number; category: string } | null
  created_at: string
}

type SignedConsent = {
  id: string
  booking_id: string | null
  template_key: string | null
  title: string
  signed_name: string
  signed_at: string
  signature: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
  no_show: '노쇼',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-roselight text-deepbrown',
  confirmed: 'bg-warmbrown text-nude',
  completed: 'bg-greige text-muted',
  cancelled: 'bg-cream-light text-muted',
  no_show: 'bg-cream-light text-muted',
}

const SKIN_TYPES = ['건성', '지성', '복합성', '민감성', '중성', '트러블성']

const ALLERGY_OPTIONS = [
  '아토피',
  '약물 알러지',
  '리도카인 알러지',
  '임신/수유',
  '켈로이드 체질',
  '헤르페스',
  '당뇨',
  '고혈압',
  '혈액응고제 복용',
  '자가면역질환',
  '흉터 잘 생김',
]

const DESIGN_GROUPS: { label: string; items: string[] }[] = [
  {
    label: '눈썹',
    items: ['아치형', '일자형', '둥근형', '각진형', '자연형', '평행형'],
  },
  {
    label: '입술',
    items: ['M자형', '스마일형', '풀립', '라인립', '그라데이션'],
  },
  {
    label: '속눈썹',
    items: ['J컬', 'C컬', 'CC컬', 'M컬', '볼륨', '내추럴'],
  },
]

const COLOR_GROUPS: { label: string; items: string[] }[] = [
  {
    label: '눈썹 컬러',
    items: ['다크브라운', '미디엄브라운', '라이트브라운', '소프트블랙', '차콜그레이'],
  },
  {
    label: '입술 컬러',
    items: ['코랄', '핑크', '와인', '누드', '레드', '체리'],
  },
]

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

function formatDateK(d: string | null) {
  if (!d) return '-'
  const date = new Date(d.includes('T') ? d : d + 'T00:00:00')
  const wd = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} (${wd})`
}

// 칩 토글 헬퍼
function toggleArr(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [history, setHistory] = useState<BookingHistory[]>([])
  const [signedConsents, setSignedConsents] = useState<SignedConsent[]>([])
  const [staffPin, setStaffPin] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [customerMode, setCustomerMode] = useState(false)
  const [pinSetupOpen, setPinSetupOpen] = useState(false)
  const [newBookingOpen, setNewBookingOpen] = useState(false)

  // 수정 가능 필드
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [skinType, setSkinType] = useState('')
  const [allergiesTags, setAllergiesTags] = useState<string[]>([])
  const [allergies, setAllergies] = useState('') // 기타 자유텍스트
  const [allergiesDrawing, setAllergiesDrawing] = useState<string | null>(null)
  const [designTags, setDesignTags] = useState<string[]>([])
  const [preferredDesign, setPreferredDesign] = useState('')
  const [designDrawing, setDesignDrawing] = useState<string | null>(null)
  const [colorTags, setColorTags] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState('')
  const [notesDrawing, setNotesDrawing] = useState<string | null>(null)
  const [nextRetouchDate, setNextRetouchDate] = useState('')

  const load = useCallback(async () => {
    const { data: c } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!c) {
      setLoading(false)
      return
    }

    const customerData = c as Customer
    setCustomer(customerData)
    setName(customerData.name ?? '')
    setPhone(customerData.phone ?? '')
    setEmail(customerData.email ?? '')
    setBirthDate(customerData.birth_date ?? '')
    setSkinType(customerData.skin_type ?? '')
    setAllergiesTags(customerData.allergies_tags ?? [])
    setAllergies(customerData.allergies ?? '')
    setAllergiesDrawing(customerData.allergies_drawing ?? null)
    setDesignTags(customerData.design_tags ?? [])
    setPreferredDesign(customerData.preferred_design ?? '')
    setDesignDrawing(customerData.design_drawing ?? null)
    setColorTags(customerData.color_tags ?? [])
    setTags(customerData.tags ?? [])
    setNotes(customerData.notes ?? '')
    setNotesDrawing(customerData.notes_drawing ?? null)
    setNextRetouchDate(customerData.next_retouch_date ?? '')

    const [
      { data: bookingsData },
      { data: salonData },
      { data: consentsData },
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select(
          `id, desired_date, desired_time, status, customer_memo, consultation, created_at,
           menu:menus(name, price, category)`
        )
        .eq('salon_id', customerData.salon_id)
        .eq('customer_phone', customerData.phone)
        .order('desired_date', { ascending: false, nullsFirst: false }),
      supabase
        .from('salons')
        .select('staff_pin')
        .eq('id', customerData.salon_id)
        .maybeSingle(),
      supabase
        .from('consents')
        .select('id, booking_id, template_key, title, signed_name, signed_at, signature')
        .eq('customer_id', customerData.id)
        .order('signed_at', { ascending: false }),
    ])

    setHistory((bookingsData as unknown as BookingHistory[]) ?? [])
    setStaffPin((salonData?.staff_pin as string | null) ?? null)
    setSignedConsents((consentsData as SignedConsent[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (!customer) return
    // 폰 번호가 바뀌었으면 중복 체크
    const phoneTrim = phone.trim()
    if (phoneTrim !== customer.phone) {
      const { data: dup } = await supabase
        .from('customers')
        .select('id')
        .eq('salon_id', customer.salon_id)
        .eq('phone', phoneTrim)
        .neq('id', id)
        .maybeSingle()
      if (dup) {
        alert('이 전화번호로 이미 등록된 다른 고객이 있어요.')
        return
      }
    }
    setSaving(true)
    const { error } = await supabase
      .from('customers')
      .update({
        name: name.trim() || null,
        phone: phoneTrim,
        email: email.trim() || null,
        birth_date: birthDate || null,
        skin_type: skinType || null,
        allergies_tags: allergiesTags,
        allergies: allergies.trim() || null,
        allergies_drawing: allergiesDrawing,
        design_tags: designTags,
        preferred_design: preferredDesign.trim() || null,
        design_drawing: designDrawing,
        color_tags: colorTags,
        notes: notes.trim() || null,
        notes_drawing: notesDrawing,
        next_retouch_date: nextRetouchDate || null,
        tags,
      })
      .eq('id', id)

    if (error) {
      alert('저장 실패: ' + error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 1500)
    load()
  }

  const handleDelete = async () => {
    if (!customer) return
    const confirmText = `${customer.name ?? '이 손님'} 정말 삭제할까요?\n예약/동의서/사진 모두 함께 삭제돼요. 되돌릴 수 없어요.`
    if (!confirm(confirmText)) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    router.push('/dashboard/customers')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light text-muted">불러오는 중...</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-bold text-deepbrown mb-3">고객을 찾을 수 없어요</p>
          <Link
            href="/dashboard/customers"
            className="text-sm font-semibold text-deepbrown underline"
          >
            고객 목록
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-greige bg-cream-light sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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
            <Link
              href="/dashboard/customers"
              className="text-sm font-medium text-muted hover:text-deepbrown"
            >
              ← 고객 목록
            </Link>
            <span className="font-display font-bold text-lg tracking-tight text-deepbrown ml-1">
              고객 차트
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {savedToast && (
              <span className="text-xs font-medium text-warmbrown">
                ✓ 저장됨
              </span>
            )}
            <button
              onClick={() => setNewBookingOpen(true)}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
            >
              📅 예약 잡기
            </button>
            <button
              onClick={() => {
                if (!staffPin) {
                  setPinSetupOpen(true)
                  return
                }
                setCustomerMode(true)
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-softpink text-softpink hover:bg-roselight/40 transition"
            >
              💁 고객 모드
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {saving ? '저장 중...' : '차트 저장'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 헤더 카드: 이름 + 통계 */}
        <section className="bg-cream-light border border-greige rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {customer.customer_number != null && (
                  <p className="font-display text-xs font-semibold text-warmbrown tracking-wider">
                    고객번호 {formatNumber(customer.customer_number)}
                  </p>
                )}
                {(() => {
                  const grade = getCustomerGrade(customer.total_visits)
                  return (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${GRADE_STYLE[grade]}`}
                    >
                      {grade}
                    </span>
                  )
                })()}
              </div>
              <h1 className="font-display font-bold text-3xl tracking-tight text-deepbrown">
                {customer.name ?? '이름 없음'}
              </h1>
              <p className="text-sm font-light text-muted mt-1">
                {formatPhone(customer.phone)}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-roselight text-deepbrown"
                    >
                      🏷 {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-5 text-center">
              <div>
                <p className="font-display font-bold text-2xl text-deepbrown">
                  {customer.total_visits}
                </p>
                <p className="text-[10px] font-light text-muted uppercase tracking-wider">
                  방문횟수
                </p>
              </div>
              <div>
                <p className="font-display font-bold text-sm text-deepbrown leading-tight pt-2">
                  {customer.last_visit_at
                    ? new Date(customer.last_visit_at).toLocaleDateString(
                        'ko-KR',
                        { month: 'short', day: 'numeric' }
                      )
                    : '-'}
                </p>
                <p className="text-[10px] font-light text-muted uppercase tracking-wider mt-1">
                  최근 방문
                </p>
              </div>
              <div>
                <p className="font-display font-bold text-sm text-deepbrown leading-tight pt-2">
                  {customer.next_retouch_date
                    ? new Date(
                        customer.next_retouch_date
                      ).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-'}
                </p>
                <p className="text-[10px] font-light text-muted uppercase tracking-wider mt-1">
                  리터치
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 기본 정보 */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-4">
            기본 정보
          </h2>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
              />
              <p className="text-[10px] font-light text-muted mt-1">
                ⚠️ 같은 번호로 다른 손님이 등록돼있으면 저장 안 돼요.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                생일
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                최근 시술
              </label>
              <div className="px-3 py-2 bg-greige/30 border border-greige rounded-lg text-sm text-deepbrown min-h-[38px] flex items-center">
                {(() => {
                  const last =
                    history.find((h) => h.status === 'completed') ?? history[0]
                  if (!last) return <span className="text-muted">아직 없음</span>
                  return (
                    <span>
                      <span className="font-display font-semibold">
                        {formatDateK(last.desired_date)}
                      </span>
                      {last.menu?.name && (
                        <span className="font-light text-muted ml-2">
                          · {last.menu.name}
                        </span>
                      )}
                    </span>
                  )
                })()}
              </div>
              <p className="text-[10px] font-light text-muted mt-1">
                예약 이력에서 자동으로 불러와요.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                다음 리터치 예정일
              </label>
              <input
                type="date"
                value={nextRetouchDate}
                onChange={(e) => setNextRetouchDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
              />
              <p className="text-[10px] font-light text-muted mt-1">
                시술 완료 처리하면 35일 후로 자동 설정돼요.
              </p>
            </div>
          </div>
        </section>

        {/* 자유 태그 */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-1">
            🏷 태그
          </h2>
          <p className="text-xs font-light text-muted mb-3">
            매장에서 자유롭게 분류하는 태그예요. (예: 단골, 신부, 민감)
          </p>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-3">
            {/* 현재 태그 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-roselight text-deepbrown"
                  >
                    🏷 {t}
                    <button
                      type="button"
                      onClick={() =>
                        setTags(tags.filter((x) => x !== t))
                      }
                      className="text-deepbrown/60 hover:text-deepbrown"
                      aria-label={`${t} 제거`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 추천 태그 */}
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                자주 쓰는 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags([...tags, t])}
                    className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white border border-greige text-deepbrown hover:bg-nude transition"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 직접 추가 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = tagInput.trim()
                    if (v && !tags.includes(v)) {
                      setTags([...tags, v])
                      setTagInput('')
                    }
                  }
                }}
                placeholder="새 태그 (Enter로 추가)"
                className="flex-1 px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
              />
              <button
                type="button"
                onClick={() => {
                  const v = tagInput.trim()
                  if (v && !tags.includes(v)) {
                    setTags([...tags, v])
                    setTagInput('')
                  }
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-greige text-deepbrown hover:bg-nude transition"
              >
                추가
              </button>
            </div>
          </div>
        </section>

        {/* ─── 💁 고객 상담 차트 (현장에서 손님이 직접 작성) ─── */}
        <section className="bg-roselight/40 border border-softpink/40 rounded-2xl p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl">💁</span>
            <div>
              <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown">
                고객 상담 차트
              </h2>
              <p className="text-xs font-light text-muted mt-0.5">
                현장에서 손님이 iPad로 직접 입력해요. 본인이 더 잘 아는 정보예요.
              </p>
            </div>
          </div>
        </section>

        {/* 피부 타입 (상담 차트 첫 항목) */}
        <section>
          <h3 className="font-bold text-base tracking-tight text-deepbrown mb-2">
            피부 타입
          </h3>
          <div className="bg-cream-light border border-greige rounded-2xl p-5">
            <select
              value={skinType}
              onChange={(e) => setSkinType(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
            >
              <option value="">선택하세요</option>
              {SKIN_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 알러지/특이사항 */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-2">
            알러지/특이사항
          </h2>
          <p className="text-xs font-light text-muted mb-3">
            해당하는 항목을 모두 누르세요. 없는 건 아래 메모에 적어주세요.
          </p>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((a) => {
                const on = allergiesTags.includes(a)
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAllergiesTags(toggleArr(allergiesTags, a))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                      on
                        ? 'bg-softpink text-deepbrown border-softpink'
                        : 'bg-white text-deepbrown border-greige hover:bg-nude'
                    }`}
                  >
                    {on && '✓ '}
                    {a}
                  </button>
                )
              })}
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                기타 메모 (원장 작성)
              </label>
              <textarea
                rows={2}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="위에 없는 특이사항을 자유롭게 적어주세요."
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown resize-none"
              />
            </div>
            {allergiesDrawing && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-deepbrown">
                    ✏️ 손님이 직접 그린 메모
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('손님이 그린 그림을 지울까요?')) {
                        setAllergiesDrawing(null)
                      }
                    }}
                    className="text-[11px] font-semibold text-muted hover:text-deepbrown underline"
                  >
                    지우기
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={allergiesDrawing}
                  alt="손님이 그린 알러지 메모"
                  className="bg-white border border-greige rounded-lg w-full"
                />
              </div>
            )}
          </div>
        </section>

        {/* 선호 디자인 */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-2">
            선호 디자인
          </h2>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-4">
            {DESIGN_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => {
                    const on = designTags.includes(item)
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setDesignTags(toggleArr(designTags, item))
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                          on
                            ? 'bg-warmbrown text-nude border-warmbrown'
                            : 'bg-white text-deepbrown border-greige hover:bg-nude'
                        }`}
                      >
                        {on && '✓ '}
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                기타 디자인 메모 (원장 작성)
              </label>
              <textarea
                rows={2}
                value={preferredDesign}
                onChange={(e) => setPreferredDesign(e.target.value)}
                placeholder="구체적인 모양/길이/각도 등 자유롭게"
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown resize-none"
              />
            </div>
            {designDrawing && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-deepbrown">
                    ✏️ 손님이 직접 그린 디자인 시안
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('손님이 그린 그림을 지울까요?')) {
                        setDesignDrawing(null)
                      }
                    }}
                    className="text-[11px] font-semibold text-muted hover:text-deepbrown underline"
                  >
                    지우기
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={designDrawing}
                  alt="손님이 그린 디자인 시안"
                  className="bg-white border border-greige rounded-lg w-full"
                />
              </div>
            )}
          </div>
        </section>

        {/* 선호 컬러 */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-2">
            선호 컬러
          </h2>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-4">
            {COLOR_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => {
                    const on = colorTags.includes(item)
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setColorTags(toggleArr(colorTags, item))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                          on
                            ? 'bg-warmbrown text-nude border-warmbrown'
                            : 'bg-white text-deepbrown border-greige hover:bg-nude'
                        }`}
                      >
                        {on && '✓ '}
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 👩‍⚕️ 고객 진단 차트 (원장이 평가/진단) ─── */}
        <section className="bg-warmbrown/10 border border-warmbrown/20 rounded-2xl p-5 mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl">👩‍⚕️</span>
            <div>
              <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown">
                고객 진단 차트
              </h2>
              <p className="text-xs font-light text-muted mt-0.5">
                상담 후 미나님이 직접 평가/진단하는 영역이에요. 손님은 안 봐요.
              </p>
            </div>
          </div>
        </section>

        {/* 진단 메모 (키보드 + 펜) */}
        <section>
          <h3 className="font-bold text-base tracking-tight text-deepbrown mb-2">
            진단 메모 + 디자인 시안
          </h3>
          <div className="space-y-4">
            <div className="bg-cream-light border border-greige rounded-2xl p-5">
              <label className="block text-xs font-medium text-deepbrown mb-2">
                ⌨️ 키보드로 적기
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="진단 결과, 시술 시 주의사항, 추천 사항 등을 입력하세요."
                className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown resize-none"
              />
            </div>
            <div className="bg-cream-light border border-greige rounded-2xl p-5">
              <label className="block text-xs font-medium text-deepbrown mb-2">
                ✏️ 펜으로 적기 / 디자인 시안 그리기
              </label>
              <DrawingCanvas
                value={notesDrawing}
                onChange={setNotesDrawing}
              />
            </div>
          </div>
        </section>

        {/* 시술 전/후 사진 */}
        <PhotoSection customerId={id} salonId={customer.salon_id} />

        {/* 시술 타임라인 (예약 + 동의서 통합) */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-1">
            📅 시술 타임라인
          </h2>
          <p className="text-xs font-light text-muted mb-4">
            예약 {history.length}건 · 작성된 동의서 {signedConsents.length}건
          </p>
          {history.length === 0 ? (
            <div className="bg-cream-light border border-greige rounded-2xl p-8 text-center">
              <p className="text-sm font-light text-muted">
                아직 시술 이력이 없어요.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((b) => {
                const consent = signedConsents.find(
                  (c) => c.booking_id === b.id
                )
                return (
                  <details
                    key={b.id}
                    className="bg-cream-light border border-greige rounded-2xl overflow-hidden"
                  >
                    <summary className="px-4 py-3 cursor-pointer hover:bg-nude/40 transition list-none">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[b.status] ?? ''}`}
                            >
                              {STATUS_LABEL[b.status] ?? b.status}
                            </span>
                            {consent && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warmbrown/15 text-deepbrown">
                                ✍️ 동의서
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-deepbrown tracking-tight text-sm">
                            {b.menu?.name ?? '메뉴 정보 없음'}
                          </p>
                          {b.customer_memo && (
                            <p className="text-xs font-light text-muted mt-1 leading-relaxed line-clamp-1">
                              📝 {b.customer_memo}
                            </p>
                          )}
                        </div>
                        <p className="font-display font-semibold text-sm text-deepbrown shrink-0">
                          {formatDateK(b.desired_date)}
                        </p>
                      </div>
                    </summary>

                    {/* 펼쳐보기 — 손님 메모 + 동의서 서명 */}
                    <div className="border-t border-greige bg-white px-4 py-3 space-y-3">
                      {b.customer_memo && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                            손님 메모
                          </p>
                          <p className="text-sm text-deepbrown whitespace-pre-line leading-relaxed">
                            {b.customer_memo}
                          </p>
                        </div>
                      )}
                      {consent ? (
                        <div className="pt-2 border-t border-greige/60">
                          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                            ✍️ {consent.title}
                          </p>
                          <p className="text-xs font-light text-muted mb-2">
                            서명자: {consent.signed_name} ·{' '}
                            {new Date(consent.signed_at).toLocaleString('ko-KR')}
                          </p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={consent.signature}
                            alt="서명"
                            className="bg-white border border-greige rounded-lg w-full max-w-xs"
                          />
                        </div>
                      ) : (
                        <p className="text-xs font-light text-muted pt-2 border-t border-greige/60">
                          동의서 미작성
                        </p>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </section>

        {/* 하단 저장 버튼 (긴 페이지라 한 번 더) */}
        <div className="pt-4 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '차트 저장'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3 rounded-xl text-sm font-semibold border border-greige text-muted hover:text-softpink hover:border-softpink transition"
          >
            🗑 이 고객 삭제
          </button>
        </div>
      </main>

      {/* 고객 모드 (전체 화면 오버레이) */}
      {customerMode && (() => {
        // 가장 적절한 활성 예약 = 취소/노쇼 아닌 가장 최근 예약
        const activeBooking = history.find(
          (h) => h.status !== 'cancelled' && h.status !== 'no_show'
        )
        const consentForActive = activeBooking
          ? signedConsents.find((c) => c.booking_id === activeBooking.id)
          : null
        return (
          <CustomerMode
            customerId={id}
            customerName={customer.name}
            staffPin={staffPin}
            salonId={customer.salon_id}
            activeBooking={
              activeBooking
                ? {
                    id: activeBooking.id,
                    menuCategory: activeBooking.menu?.category ?? 'eyebrow',
                  }
                : null
            }
            consentAlreadySigned={!!consentForActive}
            initial={{
              skinType,
              allergies,
              allergiesTags,
              allergiesDrawing,
              designTags,
              colorTags,
              preferredDesign,
              designDrawing,
            }}
            onExit={(saved) => {
              setSkinType(saved.skinType)
              setAllergies(saved.allergies)
              setAllergiesTags(saved.allergiesTags)
              setAllergiesDrawing(saved.allergiesDrawing)
              setDesignTags(saved.designTags)
              setColorTags(saved.colorTags)
              setPreferredDesign(saved.preferredDesign)
              setDesignDrawing(saved.designDrawing)
              setCustomerMode(false)
              setSavedToast(true)
              setTimeout(() => setSavedToast(false), 1500)
              load() // 동의서 이력 다시 로드
            }}
          />
        )
      })()}

      {/* PIN 설정 모달 (PIN이 없는 상태에서 고객 모드 누르면 자동 노출) */}
      {pinSetupOpen && (
        <PinSetupModal
          salonId={customer.salon_id}
          onClose={() => setPinSetupOpen(false)}
          onSet={(pin) => {
            setStaffPin(pin)
            setPinSetupOpen(false)
            setCustomerMode(true)
          }}
        />
      )}

      {/* 다음 예약 잡기 모달 */}
      {newBookingOpen && (
        <NewBookingModal
          salonId={customer.salon_id}
          customerName={customer.name ?? ''}
          customerPhone={customer.phone}
          customerEmail={customer.email}
          onClose={() => setNewBookingOpen(false)}
          onCreated={() => {
            setNewBookingOpen(false)
            load()
          }}
        />
      )}
    </div>
  )
}
