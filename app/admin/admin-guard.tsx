'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking')

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'super_admin') {
        setState('ok')
      } else {
        setState('denied')
      }
    }
    check()
  }, [router])

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light text-muted">권한 확인 중...</p>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-3xl mb-3">🔒</p>
          <p className="font-bold text-deepbrown tracking-tight mb-1">
            관리자 권한이 필요해요
          </p>
          <p className="text-sm font-light text-muted mb-5">
            이 페이지는 BrowChart SaaS 운영자만 접근할 수 있어요.
          </p>
          <Link
            href="/dashboard"
            className="inline-block btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
