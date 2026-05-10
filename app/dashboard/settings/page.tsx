'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BookingLinkBox from '../booking-link-box'

type DayHours = { open: number; close: number; closed: boolean }

type Salon = {
  id: string
  name: string
  slug: string
  staff_pin: string | null
  open_hour: number
  close_hour: number
  business_hours: DayHours[] | null
  closed_dates: string[] | null
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const defaultHours: DayHours[] = Array(7).fill({
  open: 10,
  close: 19,
  closed: false,
})

export default function SettingsPage() {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [pinDialog, setPinDialog] = useState(false)
  const [hours, setHours] = useState<DayHours[]>(defaultHours)
  const [closedDates, setClosedDates] = useState<string[]>([])
  const [newClosedDate, setNewClosedDate] = useState('')
  const [savingHours, setSavingHours] = useState(false)
  const [hoursToast, setHoursToast] = useState(false)

  // 매장 정보 편집
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [infoEditable, setInfoEditable] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoToast, setInfoToast] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  // 비밀번호 확인 모달
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [pwChecking, setPwChecking] = useState(false)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('salons')
        .select(
          'id, name, slug, staff_pin, open_hour, close_hour, business_hours, closed_dates'
        )
        .eq('owner_id', user.id)
        .maybeSingle()
      setSalon(data as Salon | null)
      if (data) {
        setEditName(data.name)
        setEditSlug(data.slug)
        setHours(
          (data.business_hours as DayHours[] | null) ??
            Array.from({ length: 7 }, () => ({
              open: data.open_hour ?? 10,
              close: data.close_hour ?? 19,
              closed: false,
            }))
        )
        setClosedDates((data.closed_dates as string[] | null) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  // 1단계: 검증 후 비밀번호 모달 열기
  const handleSaveInfoClick = async () => {
    if (!salon) return
    setInfoError(null)
    if (!editName.trim()) {
      setInfoError('매장명을 입력해주세요.')
      return
    }
    if (!/^[a-z0-9-]{2,30}$/.test(editSlug)) {
      setInfoError(
        '링크 이름은 영문 소문자/숫자/하이픈만 2~30자로 입력하세요.'
      )
      return
    }
    // 변경된 게 없으면 그냥 종료
    if (editName.trim() === salon.name && editSlug === salon.slug) {
      setInfoError('변경된 내용이 없어요.')
      return
    }
    if (editSlug !== salon.slug) {
      // slug 변경 시 중복 체크
      const { data: dup } = await supabase
        .from('salons')
        .select('id')
        .eq('slug', editSlug)
        .neq('id', salon.id)
        .maybeSingle()
      if (dup) {
        setInfoError('이미 사용 중인 링크 이름이에요. 다른 걸 시도해주세요.')
        return
      }
    }
    // 비밀번호 모달 열기
    setPwInput('')
    setPwError(false)
    setPwModalOpen(true)
  }

  // 2단계: 비밀번호 검증 후 실제 저장
  const handleConfirmAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salon) return
    setPwChecking(true)
    setPwError(false)

    // 현재 사용자 이메일로 비번 재검증
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      alert('로그인 정보를 찾을 수 없어요.')
      setPwChecking(false)
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwInput,
    })
    if (signInError) {
      setPwError(true)
      setPwInput('')
      setPwChecking(false)
      setTimeout(() => setPwError(false), 600)
      return
    }

    // 비번 OK → 실제 저장
    setSavingInfo(true)
    const { error: updateError } = await supabase
      .from('salons')
      .update({ name: editName.trim(), slug: editSlug })
      .eq('id', salon.id)
    setSavingInfo(false)
    setPwChecking(false)

    if (updateError) {
      setInfoError('저장 실패: ' + updateError.message)
      setPwModalOpen(false)
      return
    }
    setSalon({ ...salon, name: editName.trim(), slug: editSlug })
    setInfoToast(true)
    setTimeout(() => setInfoToast(false), 1500)
    setPwModalOpen(false)
    setPwInput('')
    setInfoEditable(false)
  }

  const updateDayHours = (idx: number, patch: Partial<DayHours>) => {
    setHours((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, ...patch } : h))
    )
  }

  const handleSaveHours = async () => {
    if (!salon) return
    for (const h of hours) {
      if (!h.closed && h.open >= h.close) {
        alert('마감 시간은 시작 시간보다 늦어야 해요.')
        return
      }
    }
    setSavingHours(true)
    const { error } = await supabase
      .from('salons')
      .update({
        business_hours: hours,
        closed_dates: closedDates,
      })
      .eq('id', salon.id)
    setSavingHours(false)
    if (error) {
      alert('저장 실패: ' + error.message)
      return
    }
    setHoursToast(true)
    setTimeout(() => setHoursToast(false), 1500)
  }

  const addClosedDate = () => {
    if (!newClosedDate) return
    if (closedDates.includes(newClosedDate)) return
    setClosedDates([...closedDates, newClosedDate].sort())
    setNewClosedDate('')
  }

  const removeClosedDate = (d: string) => {
    setClosedDates(closedDates.filter((x) => x !== d))
  }

  const handlePinUpdated = (pin: string | null) => {
    if (salon) setSalon({ ...salon, staff_pin: pin })
    setPinDialog(false)
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

  return (
    <div className="min-h-screen">
      <header className="border-b border-greige bg-cream-light">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Link
            href="/dashboard"
            title="홈으로"
            className="px-2.5 py-1.5 rounded-lg border border-greige bg-white text-deepbrown hover:bg-nude transition text-base"
          >
            🏠
          </Link>
          <span className="font-display font-bold text-lg tracking-tight text-deepbrown ml-1">
            매장 설정
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* 매장 정보 (락 → 수정 클릭 시 편집) */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown">
              매장 정보
            </h2>
            {infoToast && (
              <span className="text-xs font-medium text-warmbrown">
                ✓ 저장됨
              </span>
            )}
          </div>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-deepbrown">
                  매장명
                </label>
                {!infoEditable && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(salon.name)
                      setEditSlug(salon.slug)
                      setInfoEditable(true)
                      setInfoError(null)
                    }}
                    className="text-[11px] font-semibold text-deepbrown underline hover:text-warmbrown"
                  >
                    ✎ 수정
                  </button>
                )}
              </div>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!infoEditable}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${
                  infoEditable
                    ? 'bg-white border-greige focus:border-warmbrown'
                    : 'bg-greige/30 border-greige text-deepbrown cursor-not-allowed'
                }`}
                placeholder="미나브로우"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                링크 이름{' '}
                <span className="font-light text-muted">
                  (영문 소문자/숫자/하이픈)
                </span>
              </label>
              <input
                type="text"
                value={editSlug}
                onChange={(e) =>
                  setEditSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  )
                }
                disabled={!infoEditable}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none font-display ${
                  infoEditable
                    ? 'bg-white border-greige focus:border-warmbrown'
                    : 'bg-greige/30 border-greige text-deepbrown cursor-not-allowed'
                }`}
                placeholder="mina-brow"
              />
              {infoEditable && (
                <p className="text-[11px] font-light text-muted mt-1.5">
                  ⚠️ 링크를 바꾸면 기존에 공유한 링크는 작동 안 해요. 신중히 결정하세요.
                </p>
              )}
            </div>
            {infoError && (
              <p className="text-sm font-medium text-softpink">{infoError}</p>
            )}

            {infoEditable ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditName(salon.name)
                    setEditSlug(salon.slug)
                    setInfoEditable(false)
                    setInfoError(null)
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-greige text-deepbrown hover:bg-nude transition"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveInfoClick}
                  disabled={savingInfo || pwChecking}
                  className="flex-1 btn-primary py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {savingInfo ? '저장 중...' : '저장 (비밀번호 필요)'}
                </button>
              </div>
            ) : (
              <p className="text-[11px] font-light text-muted">
                🔒 수정하려면 위쪽 <span className="font-semibold">✎ 수정</span> 버튼 클릭. 저장 시 계정 비밀번호 확인이 필요해요.
              </p>
            )}

            <div className="pt-3 border-t border-greige">
              <BookingLinkBox slug={salon.slug} variant="card" />
            </div>
          </div>
        </section>

        {/* 영업시간 (요일별) */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown">
              요일별 영업시간
            </h2>
            {hoursToast && (
              <span className="text-xs font-medium text-warmbrown">
                ✓ 저장됨
              </span>
            )}
          </div>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-3">
            <p className="text-xs font-light text-muted mb-2">
              손님이 예약할 때 이 시간 안에서만 슬롯이 보여요. 휴무일은 슬롯 자체가 안 보임.
            </p>
            {hours.map((h, i) => (
              <div
                key={i}
                className="grid grid-cols-[28px_1fr_1fr_70px] items-center gap-2 sm:gap-3 py-1"
              >
                <span
                  className={`font-display font-bold text-sm text-center ${
                    i === 0
                      ? 'text-softpink'
                      : i === 6
                        ? 'text-warmbrown'
                        : 'text-deepbrown'
                  }`}
                >
                  {DAYS[i]}
                </span>
                <select
                  value={h.open}
                  disabled={h.closed}
                  onChange={(e) =>
                    updateDayHours(i, { open: Number(e.target.value) })
                  }
                  className="px-2 py-1.5 bg-white border border-greige rounded-lg text-xs sm:text-sm focus:outline-none focus:border-warmbrown disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Array.from({ length: 24 }, (_, x) => (
                    <option key={x} value={x}>
                      {String(x).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <select
                  value={h.close}
                  disabled={h.closed}
                  onChange={(e) =>
                    updateDayHours(i, { close: Number(e.target.value) })
                  }
                  className="px-2 py-1.5 bg-white border border-greige rounded-lg text-xs sm:text-sm focus:outline-none focus:border-warmbrown disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Array.from({ length: 24 }, (_, x) => (
                    <option key={x} value={x}>
                      {String(x).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <label className="flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) =>
                      updateDayHours(i, { closed: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-warmbrown"
                  />
                  <span className={h.closed ? 'text-softpink' : 'text-muted'}>
                    휴무
                  </span>
                </label>
              </div>
            ))}
            <button
              onClick={handleSaveHours}
              disabled={savingHours}
              className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 mt-2"
            >
              {savingHours ? '저장 중...' : '영업시간 저장'}
            </button>
          </div>
        </section>

        {/* 특정 날짜 휴무 */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-3">
            특정 날짜 휴무
          </h2>
          <div className="bg-cream-light border border-greige rounded-2xl p-5 space-y-3">
            <p className="text-xs font-light text-muted">
              명절·개인 사정으로 그날만 쉬는 날을 추가하세요. 그날은 손님이 예약 못 해요.
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={newClosedDate}
                onChange={(e) => setNewClosedDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
              />
              <button
                type="button"
                onClick={addClosedDate}
                disabled={!newClosedDate}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-greige text-deepbrown hover:bg-nude transition disabled:opacity-50"
              >
                + 추가
              </button>
            </div>
            {closedDates.length === 0 ? (
              <p className="text-xs font-light text-muted">
                추가된 휴무 날짜가 없어요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {closedDates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-softpink/40 text-deepbrown"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeClosedDate(d)}
                      className="text-deepbrown/60 hover:text-deepbrown"
                      aria-label={`${d} 제거`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] font-light text-muted">
              * 위에서 영업시간 저장 버튼 누르면 휴무 날짜도 같이 저장돼요.
            </p>
          </div>
        </section>

        {/* 직원 PIN */}
        <section>
          <h2 className="font-display font-bold text-xl tracking-tight text-deepbrown mb-3">
            직원 PIN
          </h2>
          <div className="bg-cream-light border border-greige rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-deepbrown tracking-tight">
                  고객 모드 빠져나올 때 사용하는 PIN
                </p>
                <p className="text-xs font-light text-muted mt-1">
                  {salon.staff_pin
                    ? `설정됨 (${salon.staff_pin.length}자리)`
                    : '아직 설정 안 됨'}
                </p>
              </div>
              <button
                onClick={() => setPinDialog(true)}
                className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
              >
                {salon.staff_pin ? 'PIN 변경' : 'PIN 설정'}
              </button>
            </div>
          </div>
        </section>
      </main>

      {pinDialog && (
        <PinChangeModal
          salonId={salon.id}
          currentPin={salon.staff_pin}
          onClose={() => setPinDialog(false)}
          onSaved={handlePinUpdated}
        />
      )}

      {/* 매장 정보 변경 시 비밀번호 확인 모달 */}
      {pwModalOpen && (
        <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <form
            onSubmit={handleConfirmAndSave}
            className="bg-nude rounded-3xl p-7 w-full max-w-sm space-y-4"
          >
            <div className="text-center">
              <p className="text-3xl mb-2">🔒</p>
              <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
                계정 비밀번호 확인
              </h3>
              <p className="text-xs font-light text-muted mt-2 leading-relaxed">
                매장명/링크를 바꾸려면
                <br />
                계정 비밀번호를 한번 더 입력해주세요.
              </p>
            </div>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              autoFocus
              placeholder="비밀번호"
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-sm focus:outline-none ${
                pwError
                  ? 'border-softpink animate-pulse'
                  : 'border-greige focus:border-warmbrown'
              }`}
            />
            {pwError && (
              <p className="text-xs font-medium text-softpink text-center">
                비밀번호가 일치하지 않아요
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPwModalOpen(false)
                  setPwInput('')
                  setPwError(false)
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pwChecking || !pwInput}
                className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {pwChecking ? '확인 중...' : '확인하고 저장'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/* ─────────── PIN 변경 모달 (현재 PIN 검증 → 새 PIN 설정) ─────────── */
function PinChangeModal({
  salonId,
  currentPin,
  onClose,
  onSaved,
}: {
  salonId: string
  currentPin: string | null
  onClose: () => void
  onSaved: (pin: string) => void
}) {
  const [step, setStep] = useState<'verify' | 'new'>(
    currentPin ? 'verify' : 'new'
  )
  const [verify, setVerify] = useState('')
  const [verifyError, setVerifyError] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (verify === currentPin) {
      setStep('new')
      setVerify('')
      setVerifyError(false)
    } else {
      setVerifyError(true)
      setTimeout(() => setVerifyError(false), 600)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPin.length < 4) {
      setError('PIN은 최소 4자리예요.')
      return
    }
    setSaving(true)
    const { error: updateError } = await supabase
      .from('salons')
      .update({ staff_pin: newPin })
      .eq('id', salonId)
    setSaving(false)
    if (updateError) {
      setError('저장 실패: ' + updateError.message)
      return
    }
    onSaved(newPin)
  }

  return (
    <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      {step === 'verify' ? (
        <form
          onSubmit={handleVerify}
          className="bg-nude rounded-3xl p-7 w-full max-w-sm space-y-4"
        >
          <div className="text-center">
            <p className="text-3xl mb-2">🔒</p>
            <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
              현재 PIN 확인
            </h3>
            <p className="text-xs font-light text-muted mt-1">
              안전을 위해 현재 PIN을 한 번 입력해주세요.
            </p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={verify}
            onChange={(e) => setVerify(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className={`w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-display font-bold bg-white border-2 rounded-xl focus:outline-none ${
              verifyError
                ? 'border-softpink animate-pulse'
                : 'border-greige focus:border-warmbrown'
            }`}
          />
          {verifyError && (
            <p className="text-xs font-medium text-softpink text-center">
              PIN이 일치하지 않아요
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold"
            >
              다음
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-nude rounded-3xl p-7 w-full max-w-sm space-y-4"
        >
          <div className="text-center">
            <p className="text-3xl mb-2">🔑</p>
            <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
              {currentPin ? '새 PIN 설정' : 'PIN 설정'}
            </h3>
            <p className="text-xs font-light text-muted mt-1">
              4~6자리 숫자로 정해주세요.
            </p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-display font-bold bg-white border-2 border-greige rounded-xl focus:outline-none focus:border-warmbrown"
          />
          {error && (
            <p className="text-xs font-medium text-softpink text-center">
              {error}
            </p>
          )}
          <div className="flex gap-2">
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
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
