'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getTemplateForCategory } from '@/lib/consent-templates'
import SignaturePad from '../../bookings/[id]/consent/signature-pad'

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

function toggleArr(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

type ExistingConsent = {
  id: string
  title: string
  signed_name: string
  signed_at: string
  signature: string
  body: {
    sections?: { title: string; bullets: string[] }[]
    agreements?: string[]
  } | null
  agreements: { text: string; checked: boolean }[] | null
}

type Props = {
  customerId: string
  customerName: string | null
  staffPin: string | null
  salonId: string
  activeBooking: { id: string; menuCategory: string } | null
  consentAlreadySigned: boolean
  existingConsent?: ExistingConsent | null
  initial: {
    skinType: string
    allergies: string
    allergiesTags: string[]
    allergiesDrawing: string | null
    designTags: string[]
    colorTags: string[]
    preferredDesign: string
    designDrawing: string | null
  }
  onExit: (saved: {
    skinType: string
    allergies: string
    allergiesTags: string[]
    allergiesDrawing: string | null
    designTags: string[]
    colorTags: string[]
    preferredDesign: string
    designDrawing: string | null
  }) => void
}

export default function CustomerMode({
  customerId,
  customerName,
  staffPin,
  salonId,
  activeBooking,
  consentAlreadySigned,
  existingConsent,
  initial,
  onExit,
}: Props) {
  const [skinType, setSkinType] = useState(initial.skinType)
  const [allergiesTags, setAllergiesTags] = useState(initial.allergiesTags)
  // allergies(자유텍스트), preferredDesign(자유텍스트)는 고객 모드에선 편집 안 함
  // 기존 값은 보존해서 그대로 다시 저장
  const allergies = initial.allergies
  const preferredDesign = initial.preferredDesign
  const [allergiesDrawing, setAllergiesDrawing] = useState<string | null>(
    initial.allergiesDrawing
  )
  const [designTags, setDesignTags] = useState(initial.designTags)
  const [colorTags, setColorTags] = useState(initial.colorTags)
  const [designDrawing, setDesignDrawing] = useState<string | null>(
    initial.designDrawing
  )

  // 동의서 (활성 예약이 있고 아직 서명 안 했으면 노출)
  const consentTemplate = activeBooking
    ? getTemplateForCategory(activeBooking.menuCategory)
    : null
  const showConsent = !!activeBooking && !consentAlreadySigned
  const [signedName, setSignedName] = useState(customerName ?? '')
  const [agreed, setAgreed] = useState<Record<number, boolean>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const allRequiredAgreed =
    consentTemplate?.agreements.every((_, i) => agreed[i]) ?? true

  const [showPin, setShowPin] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 백 버튼/스와이프-백 시 자동 종료 차단 → PIN 모달 강제
  useEffect(() => {
    window.history.pushState({ customerMode: true }, '')
    const handlePopState = () => {
      // 다시 push해서 페이지가 실제로 뒤로 가지 않도록
      window.history.pushState({ customerMode: true }, '')
      setShowPin(true)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleFinish = async () => {
    setError(null)

    // 동의서 검증 (있을 때만)
    if (showConsent) {
      if (!allRequiredAgreed) {
        setError('동의서의 모든 항목에 체크해주세요.')
        return
      }
      if (!signature) {
        setError('서명을 해주세요.')
        return
      }
      if (!signedName.trim()) {
        setError('이름을 입력해주세요.')
        return
      }
    }

    setSaving(true)

    // 1) 동의서 저장 (해당되는 경우)
    if (showConsent && consentTemplate && activeBooking) {
      const { error: consentError } = await supabase.from('consents').insert({
        salon_id: salonId,
        booking_id: activeBooking.id,
        customer_id: customerId,
        template_key: consentTemplate.key,
        title: consentTemplate.title,
        body: {
          sections: consentTemplate.sections,
          agreements: consentTemplate.agreements,
        },
        agreements: consentTemplate.agreements.map((text, i) => ({
          text,
          checked: !!agreed[i],
        })),
        signature,
        signed_name: signedName.trim(),
      })
      if (consentError) {
        setSaving(false)
        setError('동의서 저장 실패: ' + consentError.message)
        return
      }
    }

    // 2) 고객 차트 업데이트
    const { error: customerError } = await supabase
      .from('customers')
      .update({
        skin_type: skinType || null,
        allergies_tags: allergiesTags,
        allergies: allergies.trim() || null,
        allergies_drawing: allergiesDrawing,
        design_tags: designTags,
        color_tags: colorTags,
        preferred_design: preferredDesign.trim() || null,
        design_drawing: designDrawing,
      })
      .eq('id', customerId)

    setSaving(false)
    if (customerError) {
      setError('고객 차트 저장 실패: ' + customerError.message)
      return
    }
    setShowPin(true)
  }

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffPin) {
      // PIN 미설정 상태 — 안전을 위해 진행 막음
      alert('매장 PIN이 설정되지 않았어요. 원장님께 문의하세요.')
      return
    }
    if (pinInput === staffPin) {
      onExit({
        skinType,
        allergies,
        allergiesTags,
        allergiesDrawing,
        designTags,
        colorTags,
        preferredDesign,
        designDrawing,
      })
    } else {
      setPinError(true)
      setPinInput('')
      setTimeout(() => setPinError(false), 600)
    }
  }

  return (
    <div className="fixed inset-0 bg-nude z-50 overflow-y-auto">
      {/* 상단: 손님 환영 */}
      <header className="bg-roselight/40 border-b border-softpink/40 px-6 py-6 text-center">
        <p className="text-xs font-light text-muted mb-1 tracking-wider uppercase">
          상담 카드
        </p>
        <h1 className="font-display font-bold text-2xl tracking-tight text-deepbrown">
          {customerName ?? '손님'}님, 안녕하세요 💁
        </h1>
        <p className="text-sm font-light text-muted mt-2">
          본인이 더 잘 아는 정보를 알려주시면 시술이 더 잘 맞아요.
          <br />
          해당하는 항목만 누르세요.
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-7">
        {/* 피부 타입 */}
        <section>
          <h2 className="font-bold text-lg tracking-tight text-deepbrown mb-3">
            1. 피부 타입
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SKIN_TYPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSkinType(s)}
                className={`py-3 text-sm font-semibold rounded-xl border transition ${
                  skinType === s
                    ? 'bg-warmbrown text-nude border-warmbrown'
                    : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* 알러지/특이사항 */}
        <section>
          <h2 className="font-bold text-lg tracking-tight text-deepbrown mb-1">
            2. 알러지/특이사항
          </h2>
          <p className="text-xs font-light text-muted mb-3">
            해당하는 것을 모두 눌러주세요.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {ALLERGY_OPTIONS.map((a) => {
              const on = allergiesTags.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAllergiesTags(toggleArr(allergiesTags, a))}
                  className={`px-4 py-2 text-sm font-semibold rounded-full border transition ${
                    on
                      ? 'bg-softpink text-deepbrown border-softpink'
                      : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
                  }`}
                >
                  {on && '✓ '}
                  {a}
                </button>
              )
            })}
          </div>
          <p className="text-xs font-medium text-deepbrown mb-1.5">
            ✏️ 위에 없는 특이사항은 펜으로 적어주세요
          </p>
          <SignaturePad
            value={allergiesDrawing}
            onChange={setAllergiesDrawing}
            placeholder="✏️ 손/펜으로 부위·특이사항을 그리거나 적어주세요"
            clearLabel="다시 그리기"
          />
        </section>

        {/* 원하는 디자인 */}
        <section>
          <h2 className="font-bold text-lg tracking-tight text-deepbrown mb-1">
            3. 원하는 디자인
          </h2>
          <p className="text-xs font-light text-muted mb-3">
            받으실 시술의 원하는 모양을 눌러주세요. 여러 개 가능해요.
          </p>
          <div className="space-y-3">
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
                        onClick={() => setDesignTags(toggleArr(designTags, item))}
                        className={`px-4 py-2 text-sm font-semibold rounded-full border transition ${
                          on
                            ? 'bg-warmbrown text-nude border-warmbrown'
                            : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
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
          <p className="text-xs font-medium text-deepbrown mt-3 mb-1.5">
            ✏️ 기타 요청 사항을 적어주세요
          </p>
          <SignaturePad
            value={designDrawing}
            onChange={setDesignDrawing}
            placeholder="✏️ 기타 요청 사항을 적어주세요"
            clearLabel="다시 그리기"
          />
        </section>

        {/* 원하는 컬러 */}
        <section>
          <h2 className="font-bold text-lg tracking-tight text-deepbrown mb-1">
            4. 원하는 컬러
          </h2>
          <div className="space-y-3">
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
                        className={`px-4 py-2 text-sm font-semibold rounded-full border transition ${
                          on
                            ? 'bg-warmbrown text-nude border-warmbrown'
                            : 'bg-white text-deepbrown border-greige hover:bg-cream-light'
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

        {/* 시술 동의서 (맨 아래) */}
        {showConsent && consentTemplate && (
          <section className="bg-white border-2 border-softpink rounded-2xl p-5">
            <h2 className="font-bold text-lg tracking-tight text-deepbrown mb-1">
              ✍️ 시술 동의서
            </h2>
            <p className="font-display font-semibold text-deepbrown text-sm mb-4">
              {consentTemplate.title}
            </p>

            {/* 본문 */}
            <div className="space-y-4 mb-5 max-h-72 overflow-y-auto pr-1 bg-cream-light/40 rounded-lg p-4 border border-greige">
              {consentTemplate.sections.map((sec, i) => (
                <div key={i}>
                  <p className="font-bold text-deepbrown text-sm mb-1.5">
                    {i + 1}. {sec.title}
                  </p>
                  <ul className="space-y-1">
                    {sec.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="text-xs font-light text-deepbrown leading-relaxed flex gap-1.5"
                      >
                        <span className="text-muted">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* 동의 항목 */}
            <p className="font-bold text-deepbrown text-sm mb-2">동의 사항</p>
            <div className="space-y-2 mb-4">
              {consentTemplate.agreements.map((a, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!agreed[i]}
                    onChange={(e) =>
                      setAgreed((prev) => ({ ...prev, [i]: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 accent-warmbrown shrink-0"
                  />
                  <span className="text-xs text-deepbrown leading-relaxed">
                    {a}
                  </span>
                </label>
              ))}
            </div>

            {/* 이름 + 서명 */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-deepbrown mb-1.5">
                  이름
                </label>
                <input
                  type="text"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
                />
              </div>
              <SignaturePad onChange={setSignature} />
            </div>
          </section>
        )}

        {/* 이미 서명된 경우 — 클릭하면 동의서 내용 펼쳐 보기 */}
        {!!activeBooking && consentAlreadySigned && (
          <details className="bg-cream-light border border-greige rounded-2xl">
            <summary className="cursor-pointer p-4 text-center list-none hover:bg-nude/40 transition rounded-2xl">
              <p className="text-sm font-medium text-deepbrown">
                ✓ 이번 시술 동의서는 이미 작성되었어요
                {existingConsent && (
                  <span className="block text-[11px] font-light text-muted mt-1">
                    클릭하면 작성된 동의서 내용을 볼 수 있어요 ▾
                  </span>
                )}
              </p>
            </summary>
            {existingConsent && (
              <div className="p-5 border-t border-greige space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base tracking-tight text-deepbrown mb-1">
                    📋 {existingConsent.title}
                  </h3>
                  <p className="text-[11px] font-light text-muted">
                    서명자: {existingConsent.signed_name} ·{' '}
                    {new Date(existingConsent.signed_at).toLocaleString('ko-KR')}
                  </p>
                </div>

                {/* 본문 섹션 */}
                {(existingConsent.body?.sections ?? []).map((sec, i) => (
                  <div key={i} className="bg-white rounded-lg p-3">
                    <p className="font-bold text-deepbrown text-xs mb-1.5">
                      {i + 1}. {sec.title}
                    </p>
                    <ul className="space-y-1">
                      {(sec.bullets ?? []).map((b, j) => (
                        <li
                          key={j}
                          className="text-[11px] font-light text-deepbrown leading-relaxed flex gap-1.5"
                        >
                          <span className="text-muted shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* 동의 체크 항목 */}
                {existingConsent.agreements &&
                  existingConsent.agreements.length > 0 && (
                    <div>
                      <p className="font-bold text-deepbrown text-xs mb-1.5">
                        ✅ 동의 사항
                      </p>
                      <div className="space-y-1.5">
                        {existingConsent.agreements.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 bg-white rounded-lg p-2"
                          >
                            <input
                              type="checkbox"
                              checked={a.checked}
                              disabled
                              className="mt-0.5 w-3.5 h-3.5 accent-warmbrown shrink-0"
                            />
                            <span className="text-[11px] text-deepbrown leading-relaxed">
                              {a.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 서명 */}
                <div>
                  <p className="font-bold text-deepbrown text-xs mb-1.5">
                    ✍️ 서명
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={existingConsent.signature}
                    alt="서명"
                    className="bg-white border-2 border-greige rounded-lg w-full max-w-sm"
                  />
                </div>
              </div>
            )}
          </details>
        )}

        {/* 다 적었어요 버튼 */}
        <div className="pt-4 space-y-3">
          {error && (
            <p className="text-sm font-medium text-softpink text-center">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="w-full btn-primary py-4 rounded-2xl text-base font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '✓ 다 적었어요 (직원 호출)'}
          </button>
        </div>
      </main>

      {/* PIN 입력 모달 */}
      {showPin && (
        <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <form
            onSubmit={handlePinSubmit}
            className="bg-nude rounded-3xl p-7 w-full max-w-sm space-y-4"
          >
            <div className="text-center">
              <p className="text-3xl mb-2">🔒</p>
              <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
                직원 PIN 입력
              </h3>
              <p className="text-xs font-light text-muted mt-1">
                상담 카드 작성이 끝났어요.
                <br />
                직원분께 iPad를 전달해주세요.
              </p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className={`w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-display font-bold bg-white border-2 rounded-xl focus:outline-none ${
                pinError
                  ? 'border-softpink animate-pulse'
                  : 'border-greige focus:border-warmbrown'
              }`}
            />
            {pinError && (
              <p className="text-xs font-medium text-softpink text-center">
                PIN이 일치하지 않아요
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPin(false)
                  setPinInput('')
                  setPinError(false)
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-greige text-deepbrown hover:bg-cream-light transition"
              >
                계속 작성
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold"
              >
                확인
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
