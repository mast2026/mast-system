export const pick = (item, keys, fallback = '-') => {
  for (const key of keys) if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '') return item[key]
  return fallback
}
export const titleOf = (item) => pick(item, ['title', 'name', 'contest_name', 'team_name', 'subject'], '제목 없음')
export const descriptionOf = (item) => pick(item, ['description', 'body', 'content', 'summary', 'message', 'introduction'], '')
export const statusOf = (item) => pick(item, ['status', 'recruitment_status', 'application_status'], 'unknown')
export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date)
}
export const isRecruiting = (item) => ['recruiting', 'open', 'active', '모집중', '진행중'].includes(String(statusOf(item)).toLowerCase())
export const safeHttpUrl = (value) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null } catch { return null } }
