'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  salonId: string
  onClose: () => void
  onSet: (pin: string) => void
}

export default function PinSetupModal({ salonId, onClose, onSet }: Props) {
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pin.length < 4) {
      setError('PIN은 최소 4자리예요.')
      return
    }
    setSaving(true)
    const { error: updateError } = await supabase
      .from('salons')
      .update({ staff_pin: pin })
      .eq('id', salonId)
    setSaving(false)
    if (updateError) {
      setError('저장 실패: ' + updateError.message)
      return
    }
    onSet(pin)
  }

  return (
    <div className="fixed inset-0 bg-deepbrown/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <form
        onSubmit={handleSave}
        className="bg-nude rounded-3xl p-7 w-full max-w-sm space-y-4"
      >
        <div className="text-center">
          <p className="text-3xl mb-2">🔑</p>
          <h3 className="font-display font-bold text-xl tracking-tight text-deepbrown">
            직원 PIN 설정
          </h3>
          <p className="text-xs font-light text-muted mt-2 leading-relaxed">
            고객 모드에서 빠져나올 때 입력할 PIN이에요.
            <br />
            손님이 모르게 외워두세요. (4~6자리 숫자)
          </p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••"
          className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-display font-bold bg-white border-2 border-greige rounded-xl focus:outline-none focus:border-warmbrown"
        />
        {error && (
          <p className="text-xs font-medium text-softpink text-center">{error}</p>
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
            {saving ? '저장 중...' : '설정 완료'}
          </button>
        </div>
      </form>
    </div>
  )
}
