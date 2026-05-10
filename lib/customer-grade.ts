// 방문횟수 기준 자동 등급
// 신규(0~1) → 일반(2~4) → 단골(5~9) → VIP(10+)

export type CustomerGrade = '신규' | '일반' | '단골' | 'VIP'

export function getCustomerGrade(visits: number): CustomerGrade {
  if (visits >= 10) return 'VIP'
  if (visits >= 5) return '단골'
  if (visits >= 2) return '일반'
  return '신규'
}

export const GRADE_STYLE: Record<CustomerGrade, string> = {
  VIP: 'bg-warmbrown text-nude',
  단골: 'bg-softpink text-deepbrown',
  일반: 'bg-greige text-deepbrown',
  신규: 'bg-cream-light text-muted border border-greige',
}

export const SUGGESTED_TAGS = [
  '단골',
  '신부',
  '민감',
  '임산부',
  '리터치 예정',
  '주의',
  '꼼꼼',
  '예민',
]
