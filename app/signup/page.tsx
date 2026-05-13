'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [salonName, setSalonName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!email || password.length < 6) {
      return alert('이메일과 6자 이상 비밀번호를 입력해주세요')
    }
    if (password !== passwordConfirm) {
      return alert('비밀번호가 일치하지 않아요')
    }
    if (!name.trim()) return alert('원장님 이름을 입력해주세요')
    if (!salonName.trim()) return alert('매장명을 입력해주세요')
    if (!/^[a-z0-9]{2,30}$/.test(slug)) {
      return alert('매장 URL은 영문 소문자와 숫자만 사용할 수 있어요 (2~30자)')
    }

    setLoading(true)

    // 1. 회원가입
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      alert('가입 실패: ' + error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      alert('가입 실패: 사용자 정보를 받지 못했어요')
      setLoading(false)
      return
    }

    if (!data.session) {
      alert(
        '가입 메일이 발송되었어요. 메일에서 인증을 완료한 뒤 로그인해주세요.\n\n' +
          '(Supabase에서 이메일 인증을 끄면 즉시 사용할 수 있어요)'
      )
      setLoading(false)
      router.replace('/login')
      return
    }

    // 2. 매장 생성
    const { data: salonData, error: salonError } = await supabase
      .from('salons')
      .insert({ name: salonName.trim(), slug, owner_id: data.user.id })
      .select()
      .single()

    if (salonError) {
      const isDuplicate = salonError.code === '23505'
      alert(
        '매장 생성 실패: ' +
          salonError.message +
          (isDuplicate ? '\n(매장 URL이 이미 사용 중이에요. 다른 URL을 입력해주세요)' : '')
      )
      setLoading(false)
      return
    }

    // 3. 프로필 생성
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      salon_id: salonData.id,
      name: name.trim(),
      role: 'owner',
    })

    if (profileError) {
      alert('프로필 생성 실패: ' + profileError.message)
      setLoading(false)
      return
    }

    // 회원가입 완료 안내
    alert(
      '🎉 회원가입이 완료되었어요!\n\n' +
        `매장: ${salonName.trim()}\n` +
        `예약 링크: /booking/${slug}\n\n` +
        '대시보드로 이동해요.'
    )
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <Link href="/" className="mb-8">
        <span className="font-display font-bold text-3xl tracking-tight text-deepbrown">
          BrowChart
        </span>
      </Link>

      <div className="w-full max-w-md bg-cream-light border border-greige rounded-2xl p-7 space-y-5">
        <div>
          <h1 className="font-bold text-xl text-deepbrown tracking-tight">
            14일 무료 시작
          </h1>
          <p className="text-xs font-light text-muted mt-1">
            매장을 만들고 손님을 받으세요. 신용카드 등록 필요 없음.
          </p>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              비밀번호 <span className="text-muted">(6자 이상)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              비밀번호 확인
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              placeholder="••••••••"
            />
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <p className="text-[11px] font-medium text-softpink mt-1.5">
                비밀번호가 일치하지 않아요
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              원장님 성함
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              placeholder="홍길동"
            />
          </div>

          <div className="pt-3 border-t border-greige">
            <p className="text-xs font-semibold text-deepbrown mb-3 tracking-tight">
              매장 정보
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-muted block mb-1.5">
                  매장명
                </label>
                <input
                  type="text"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
                  placeholder="미나브로우"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted block mb-1.5">
                  매장 URL{' '}
                  <span className="font-light text-muted">
                    (영문 소문자/숫자만)
                  </span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSignup()
                  }}
                  className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition font-display"
                  placeholder="minabrow"
                />
                <p className="text-[11px] font-light text-muted mt-1.5 tracking-tight">
                  손님 예약링크: <span className="font-medium text-deepbrown">/booking/{slug || 'minabrow'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? '가입 중...' : '매장 만들고 시작하기'}
        </button>

        <p className="text-xs text-center font-light text-muted pt-1">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-deepbrown underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
