'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert('로그인 실패: ' + error.message)
      setLoading(false)
      return
    }
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="mb-10">
        <span className="font-display font-bold text-3xl tracking-tight text-deepbrown">
          BrowChart
        </span>
      </Link>

      <div className="w-full max-w-sm bg-cream-light border border-greige rounded-2xl p-7 space-y-5">
        <div>
          <h1 className="font-bold text-xl text-deepbrown tracking-tight">로그인</h1>
          <p className="text-xs font-light text-muted mt-1">
            매장 관리자 계정으로 로그인하세요.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin()
              }}
              className="w-full bg-nude border border-greige rounded-lg px-3 py-2.5 text-sm outline-none focus:border-warmbrown transition"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <p className="text-xs text-center font-light text-muted pt-2">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-semibold text-deepbrown underline">
            무료로 시작하기
          </Link>
        </p>
      </div>
    </div>
  )
}
