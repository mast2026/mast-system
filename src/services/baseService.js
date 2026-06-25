import { isSupabaseConfigured, supabase } from '../lib/supabase'

export const TABLES = {
  members: 'team_matching_members', contests: 'team_matching_contests',
  teams: 'team_matching_teams', teamMembers: 'team_matching_team_members',
  applications: 'team_matching_applications', leaderApplications: 'team_matching_leader_applications',
  announcements: 'team_matching_announcements', notifications: 'team_matching_notifications',
  peerReviews: 'team_matching_peer_reviews', peerReviewSummary: 'team_matching_peer_review_summary_view',
  progressView: 'promotion_member_progress_view',
  scoreEvents: 'team_matching_member_score_events', awards: 'team_matching_awards',
  memberPasswords: 'team_matching_member_passwords',
  attendanceSummary: 'activity_attendance_summary_view',
  notificationReads: 'team_matching_notification_reads',
}

export async function selectAll(table, { column, value, ascending = false, limit } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  let query = supabase.from(table).select('*')
  if (column && value !== undefined && value !== null) query = query.eq(column, value)
  query = query.order('id', { ascending })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function selectOne(table, id) {
  if (!isSupabaseConfigured) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  return supabase
}

export function throwIfError(error) {
  if (error) throw error
}
