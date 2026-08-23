import { TABLES, requireSupabase, selectAll, selectOne, throwIfError } from './baseService'
import { getActiveContests } from './contestService'
import { getEnrichedTeams, TEAM_PUBLIC_FIELDS } from './teamService'

const HIDDEN_ANNOUNCEMENT_TITLES = new Set([
  '공모전 팀원 모집 시 프로필 작성 가이드',
  '팀 매칭 성공 사례 공유 이벤트',
  '2026년 1기 팀 매칭 플랫폼 오픈',
])

const isTestContent = (row) => String(row?.title ?? '').trim().startsWith('[테스트]')

export const getContests = () => selectAll(TABLES.contests)
export const getContest = (id) => selectOne(TABLES.contests, id)
export async function getTeams() { const { data, error } = await requireSupabase().from(TABLES.teams).select(TEAM_PUBLIC_FIELDS).order('id', { ascending: false }); throwIfError(error); return data ?? [] }
export async function getTeam(id) { const { data, error } = await requireSupabase().from(TABLES.teams).select(TEAM_PUBLIC_FIELDS).eq('id', id).maybeSingle(); throwIfError(error); return data }
export const getTeamMembers = () => selectAll(TABLES.teamMembers)
export const getApplications = () => selectAll(TABLES.applications)
export const getLeaderApplications = () => selectAll(TABLES.leaderApplications)
export async function getAnnouncements(limit) {
  const rows = await selectAll(TABLES.announcements)
  const visibleRows = rows
    .filter((row) => row.is_published !== false && row.is_active !== false)
    .filter((row) => !isTestContent(row) && !HIDDEN_ANNOUNCEMENT_TITLES.has(String(row.title ?? '').trim()))
    .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0))
  return limit ? visibleRows.slice(0, limit) : visibleRows
}
export async function getNotifications(memberId, limit) {
  let query = requireSupabase()
    .from(TABLES.notifications)
    .select('*')
    .or(`member_id.eq.${Number(memberId)},member_id.is.null`)
    .not('title', 'ilike', '[테스트]%')
    .order('id', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  throwIfError(error)
  return (data ?? []).filter((row) => !isTestContent(row))
}

export async function getOverview(memberId) {
  const names = ['contests', 'teams', 'memberships', 'applications', 'announcements', 'notifications']
  const settled = await Promise.allSettled([getActiveContests(), getEnrichedTeams(), getTeamMembers(), getApplications(), getAnnouncements(5), getNotifications(memberId, 5)])
  const values = settled.map((result) => result.status === 'fulfilled' ? (result.value ?? []) : [])
  const unavailable = settled.flatMap((result, index) => result.status === 'rejected' ? [names[index]] : [])
  const [contests, teams, memberships, applications, announcements, notifications] = values
  const activeMemberships = memberships.filter((membership) => !Object.prototype.hasOwnProperty.call(membership, 'status') || membership.status === 'active')
  return { contests, teams, memberships: activeMemberships, applications, announcements, notifications, unavailable }
}
