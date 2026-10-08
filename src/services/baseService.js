import { isSupabaseConfigured, supabase } from '../lib/supabase'

export const MEMBER_FIELDS = 'id,mast_member_id,name,school,major,generation,role,is_leader,position_title,admin_sections,created_at,updated_at,roster_status,roster_number,instagram_handle,is_officer,roster_notes'
export const LEGACY_MEMBER_FIELDS = 'id,name,gi,school,major,role,status,created_at,updated_at,instagram_handle,roster_number,position_title,roster_notes,is_officer'
export const SESSION_FIELDS = 'id,title,description,session_type,starts_at,ends_at,location,base_points,counts_in_activity_weather,status,created_by_member_id,created_at,updated_at,attendance_code_enabled,attendance_open_at,attendance_close_at,session_mode,is_orientation,target_generations,ontime_at'
export const safeFields = (table) => table === 'team_matching_members' ? MEMBER_FIELDS : table === 'members' ? LEGACY_MEMBER_FIELDS : table === 'activity_sessions' ? SESSION_FIELDS : '*'
export const readableTable = (table) => table === 'activity_sessions' ? 'mast_activity_sessions_client' : table

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
  let query = supabase.from(readableTable(table)).select(table === 'activity_sessions' ? '*' : safeFields(table))
  if (column && value !== undefined && value !== null) query = query.eq(column, value)
  query = query.order('id', { ascending })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function selectOne(table, id) {
  if (!isSupabaseConfigured) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  const { data, error } = await supabase.from(readableTable(table)).select(table === 'activity_sessions' ? '*' : safeFields(table)).eq('id', id).maybeSingle()
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
