// 직책별 관리자 권한에서 사용하는 섹션 정의 (한 곳에서 관리)
import { Award, Bell, CalendarDays, CloudSun, Megaphone, Trophy, Users } from 'lucide-react'

export const ADMIN_SECTIONS = [
  { key: 'attendance', label: '출석 관리', to: '/admin/attendance', Icon: CalendarDays, paths: ['/admin/attendance'] },
  { key: 'promotion', label: '홍보 관리', to: '/admin/promotion', Icon: Megaphone, paths: ['/admin/promotion'] },
  { key: 'contest', label: '공모전·팀매칭', to: '/admin/contest', Icon: Trophy, paths: ['/admin/contest', '/admin/contests', '/admin/leader-applications', '/admin/teams', '/admin/applications', '/admin/leave-requests'] },
  { key: 'members', label: '회원 관리', to: '/admin/members', Icon: Users, paths: ['/admin/members'] },
  { key: 'notice', label: '공지·알림', to: '/admin/announcements', Icon: Bell, paths: ['/admin/announcements', '/admin/notifications', '/admin/notices'] },
  { key: 'evaluation', label: '평가·성과', to: '/admin/activity-weather', Icon: CloudSun, paths: ['/admin/activity-weather', '/admin/peer-reviews', '/admin/awards'] },
]

export const ADMIN_SECTION_KEYS = ADMIN_SECTIONS.map((s) => s.key)
export const sectionLabel = (key) => (ADMIN_SECTIONS.find((s) => s.key === key)?.label ?? key)

// DB에 jsonb 배열 또는 문자열로 들어와도 안전하게 키 배열로 정규화
export function normalizeSections(value) {
  let arr = value
  if (typeof value === 'string') {
    try { arr = JSON.parse(value) } catch { arr = [] }
  }
  if (!Array.isArray(arr)) return []
  return arr.map(String).filter((k) => ADMIN_SECTION_KEYS.includes(k))
}

// 경로가 어떤 섹션에 속하는지
export function sectionKeyForPath(pathname) {
  const path = String(pathname || '').split('?')[0]
  const hit = ADMIN_SECTIONS.find((s) => s.paths.some((p) => path === p || path.startsWith(p + '/')))
  return hit ? hit.key : null
}

// 해당 경로에 접근 가능한지 (전체 관리자면 무조건 허용, 일부 권한 회원은 허용 섹션만)
export function canAccessAdminPath(sections, pathname, isFullAdmin) {
  if (isFullAdmin) return true
  const path = String(pathname || '').split('?')[0]
  if (path === '/admin') return false
  const key = sectionKeyForPath(path)
  return !!key && sections.includes(key)
}
