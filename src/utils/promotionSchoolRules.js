const normalizeSchool = (school) => String(school ?? '').replace(/\s/g, '').toLowerCase()
export const HUFS_REQUIRED_COPY = '본 단체는 한국외국어대학교 경영전략학회 MAST와는 무관합니다.'
export function promotionIntervalDays(school) {
  const key = normalizeSchool(school)
  return key.startsWith('연세대학교') && key.includes('미래') ? 14 : 3
}
export function promotionCopyForSchool(body, school) {
  const text = String(body ?? '')
  if (!normalizeSchool(school).startsWith('한국외국어대학교') || text.includes(HUFS_REQUIRED_COPY)) return text
  return [text, HUFS_REQUIRED_COPY].filter(Boolean).join('\n\n')
}
