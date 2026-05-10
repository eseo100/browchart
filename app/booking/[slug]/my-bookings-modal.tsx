'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type MyBooking = {
  id: string
  customer_name: string
  desired_date: string | null
  desired_time: string | null
  status: string
  deposit_amount: number
  deposit_status: string
  menu_name: string | null
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: '확인 대기',
  confirmed: '예약 확정',
  completed: '시술 완료',
  cancelled: '취소됨',
  no_show: '노쇼',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-roselight text-deepbrown',
  confirmed: 'bg-warmbrown text-nude',
  completed: 'bg-greige text-muted',
  cancelled: 'bg-cream-light text-muted line-through',
  no_show: 'bg-cream-light text-muted',
}

function formatDate(date: string | null, time: string | null) {
  if (!date) return '미정'
  const d = new Date(date + 'T00:00:00')
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`
  return time ? `${md} ${time.slice(0, 5)}` : md
}

export default function MyBookingsModal({
  slug,
  onClose,
}: {
  slug: string
  onClose: () => void
}) {
  const [phone, setPhone] = useState('')
  const [bookings, setBookings] = useState<MyBooking[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc(
      'get_bookings_by_phone',
      {
        p_salon_slug: slug,
        p_phone: phone.trim(),
      }
    )

    if (rpcError) {
      setError('조회에 실패했어요. 잠시 후 다시 시도해주세요.')
      setLoading(false)
      return
    }
    setBookings((data as MyBooking[]) ?? [])
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-nude w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-nude border-b border-greige px-6 py-4 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg tracking-tight text-deepbrown">
            내 예약 조회
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-deepbrown text-xl leading-none"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleSearch} className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-deepbrown mb-1.5">
                예약하실 때 입력하신 전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-4 py-2.5 bg-white border border-greige rounded-lg text-sm focus:outline-none focus:border-warmbrown"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full btn-primary py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading ? '조회 중...' : '조회하기'}
            </button>
          </form>

          {error && (
            <p className="text-sm text-softpink font-medium">{error}</p>
          )}

          {bookings !== null && bookings.length === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl mb-3">🔍</p>
              <p className="font-bold text-deepbrown tracking-tight mb-1">
                예약 내역이 없어요
              </p>
              <p className="text-sm font-light text-muted">
                전화번호를 다시 확인해주세요.
              </p>
            </div>
          )}

          {bookings && bookings.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-light text-muted">
                총 {bookings.length}건의 예약을 찾았어요
              </p>
              {bookings.map((b) => (
                <article
                  key={b.id}
                  className="bg-cream-light border border-greige rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[b.status] ?? ''}`}
                    >
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    {b.deposit_amount > 0 && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          b.deposit_status === 'paid'
                            ? 'bg-warmbrown text-nude'
                            : 'bg-greige text-muted'
                        }`}
                      >
                        {b.deposit_status === 'paid'
                          ? '입금 확인됨'
                          : '입금 대기'}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-deepbrown tracking-tight mb-1">
                    {b.menu_name ?? '메뉴 정보 없음'}
                  </p>
                  <p className="text-sm font-light text-deepbrown">
                    {formatDate(b.desired_date, b.desired_time)}
                  </p>
                  {b.deposit_amount > 0 && b.deposit_status !== 'paid' && (
                    <p className="text-xs font-light text-muted mt-2">
                      예약금 {b.deposit_amount.toLocaleString()}원 입금 후
                      예약이 확정돼요.
                    </p>
                  )}
                  {b.status === 'pending' && (
                    <p className="text-xs font-light text-muted mt-2">
                      원장님 확인 후 예약 확정 안내가 갈 거예요.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
