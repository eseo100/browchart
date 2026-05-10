import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BrowChart',
    short_name: 'BrowChart',
    description: '반영구 메이크업 매장 차트·예약·동의서 관리',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FAF6F1',
    theme_color: '#6B4F3A',
    orientation: 'portrait',
    lang: 'ko',
  }
}
