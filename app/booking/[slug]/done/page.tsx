'use client'

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type BookingDone = {
  id: string
  customer_name: string
  desired_date: string | null
  desired_time: string | null
  deposit_amount: number
  deposit_status: string
  status: string
  menu_name: string | null
  menu_price: number | null
  salon_name: string | null
  salon_slug: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
}

export default function BookingDonePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [booking, setBooking] = useState<BookingDone | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      const { data } = await supabase.rpc('get_booking_by_token', {
        p_token: token,
      })
      const row = Array.isArray(data) ? data[0] : data
      setBooking((row as BookingDone) ?? null)
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-light text-muted">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-roselight mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-deepbrown mb-2">
            예약 신청이 접수됐어요
          </h1>
          <p className="text-sm font-light text-muted leading-relaxed">
            원장님이 확인 후 연락드릴 거예요.
            <br />
            예약 확정 문자를 기다려주세요.
          </p>
        </div>

        {booking?.menu_name && (
          <section className="bg-cream-light border border-greige rounded-2xl p-5 mb-5">
            <p className="text-xs font-light text-muted mb-2">신청 내역</p>
            <p className="font-bold text-deepbrown tracking-tight mb-1">
              {booking.menu_name}
            </p>
            <p className="text-xs font-light text-muted">
              {(booking.menu_price ?? 0).toLocaleString()}원
              {booking.desired_date && (
                <>
                  {' · '}
                  {booking.desired_date}
                  {booking.desired_time && ` ${booking.desired_time}`}
                </>
              )}
            </p>
          </section>
        )}

        {/* 입금 안내 */}
        {booking && booking.deposit_amount > 0 && (
          <section className="bg-cream-light border border-greige rounded-2xl p-5 mb-5">
            <h2 className="font-bold text-deepbrown tracking-tight mb-3">
              💰 예약금 입금 안내
            </h2>
            <p className="text-sm font-light text-deepbrown leading-relaxed mb-3">
              예약금{' '}
              <span className="font-bold">
                {booking.deposit_amount.toLocaleString()}원
              </span>
              을 아래 계좌로 입금해주시면 예약이 확정돼요.
            </p>
            {booking.bank_name || booking.account_number ? (
              <div className="bg-white border border-greige rounded-lg p-4 space-y-1.5">
                {booking.bank_name && (
                  <p className="text-sm text-deepbrown">
                    <span className="font-light text-muted w-16 inline-block">
                      은행
                    </span>
                    <span className="font-semibold">{booking.bank_name}</span>
                  </p>
                )}
                {booking.account_number && (
                  <p className="text-sm text-deepbrown flex items-center gap-2">
                    <span className="font-light text-muted w-16 inline-block">
                      계좌
                    </span>
                    <span className="font-display font-bold tracking-wide flex-1">
                      {booking.account_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          booking.account_number ?? ''
                        )
                        alert('계좌번호가 복사됐어요')
                      }}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md border border-greige text-deepbrown hover:bg-cream-light transition whitespace-nowrap"
                    >
                      복사
                    </button>
                  </p>
                )}
                {booking.account_holder && (
                  <p className="text-sm text-deepbrown">
                    <span className="font-light text-muted w-16 inline-block">
                      예금주
                    </span>
                    <span className="font-semibold">
                      {booking.account_holder}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white border border-greige rounded-lg p-3 text-sm font-light text-muted">
                계좌 정보는 원장님이 확인 문자로 안내해드릴 거예요.
              </div>
            )}
            <p className="text-[11px] font-light text-muted mt-3 leading-relaxed">
              * 입금자명은 예약자 본인 이름으로 부탁드려요.
              <br />* 입금 후 24시간 내 예약이 확정됩니다.
            </p>
          </section>
        )}

        <section className="bg-cream-light border border-greige rounded-2xl p-5 mb-8">
          <h2 className="font-bold text-deepbrown tracking-tight mb-2">
            📋 안내사항
          </h2>
          <ul className="text-xs font-light text-muted leading-relaxed space-y-1.5">
            <li>• 시술 당일 자세한 동의서를 작성해요.</li>
            <li>• 변경/취소는 예약 확정 문자에 안내된 방법으로 부탁드려요.</li>
            <li>• 입력하신 연락처로 안내 문자가 발송돼요.</li>
          </ul>
        </section>

        <Link
          href={`/booking/${slug}`}
          className="block w-full text-center bg-white border border-greige py-3 rounded-xl text-sm font-semibold text-deepbrown hover:bg-cream-light transition"
        >
          매장 메뉴로 돌아가기
        </Link>
      </main>
    </div>
  )
}
