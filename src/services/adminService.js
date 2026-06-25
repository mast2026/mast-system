import { getAllActivityWeather } from './activityWeatherService'
import { TABLES, requireSupabase, throwIfError } from './baseService'
import { getMembers } from './memberService'
import { deleteTeamPost, TEAM_PUBLIC_FIELDS } from './teamService'

export async function getAdminDashboardData() {
  const [members, contests, teams, applications, leaderApplications, weatherRows, attendance, promotion] = await Promise.all([
    safeSelect(TABLES.members),
    safeSelect(TABLES.contests),
    safeSelect(TABLES.teams),
    safeSelect(TABLES.applications),
    safeSelect(TABLES.leaderApplications),
    getAdminActivityWeatherRows().catch(() => []),
    getAdminAttendanceOverview().catch(() => emptyAdminOverview()),
    getAdminPromotionOverview().catch(() => emptyAdminOverview()),
  ])
  return {
    stats: {
      members: members.length,
      activeContests: contests.filter((item) => item.is_active).length,
      recruitingTeams: teams.filter((item) => item.status === 'recruiting').length,
      pendingLeaderApplications: leaderApplications.filter((item) => item.status === 'pending').length,
      pendingApplications: applications.filter((item) => item.status === 'pending').length,
      activityWeatherMembers: weatherRows.length,
      attendanceOpenSessions: attendance.sessions.filter((item) => ['open', 'scheduled'].includes(String(item.status ?? 'scheduled'))).length,
      attendanceUnchecked: Math.max(0, Number(attendance.members.length || 0) - Number(attendance.records.filter((row) => row.status === 'present').length || 0)),
      promotionPending: promotion.assignments.filter((item) => ['submitted', 'pending_review'].includes(String(item.status ?? ''))).length,
      promotionMissing: promotion.assignments.filter((item) => ['pending', 'missed', 'rejected'].includes(String(item.status ?? 'pending'))).length,
    },
    recentContests: sortDesc(contests).slice(0, 5),
    recentTeams: sortDesc(teams).slice(0, 5),
    recentApplications: sortDesc(applications).slice(0, 5),
  }
}

export async function getAdminAttendanceOverview() {
  const [sessions, records, summary, members] = await Promise.all([
    safeSelectSoft('activity_sessions', 'starts_at'),
    safeSelectSoft('activity_attendance_records', 'checked_at'),
    safeSelectSoft('activity_attendance_summary_view'),
    safeSelectSoft('members'),
  ])
  return {
    sessions: sessions.data,
    records: records.data,
    summary: summary.data,
    members: members.data,
    warnings: [sessions, records, summary, members].filter((item) => item.error).map((item) => item.error),
  }
}

export async function getAdminPromotionOverview() {
  const [missions, assignments, proofs, progress, members] = await Promise.all([
    safeSelectSoft('promotion_missions', 'mission_date'),
    safeSelectSoft('promotion_assignment_status_view', 'mission_date'),
    safeSelectSoft('promotion_proofs', 'submitted_at'),
    safeSelectSoft('promotion_member_progress_view'),
    safeSelectSoft('members'),
  ])
  return {
    missions: missions.data,
    assignments: assignments.data,
    proofs: proofs.data,
    progress: progress.data,
    members: members.data,
    warnings: [missions, assignments, proofs, progress, members].filter((item) => item.error).map((item) => item.error),
  }
}

export async function getAdminContestHubSummary() {
  const [contests, teams, applications, leaderApplications] = await Promise.all([
    safeSelectSoft(TABLES.contests),
    safeSelectSoft(TABLES.teams),
    safeSelectSoft(TABLES.applications),
    safeSelectSoft(TABLES.leaderApplications),
  ])
  return {
    stats: {
      activeContests: contests.data.filter((item) => item.is_active !== false).length,
      recruitingTeams: teams.data.filter((item) => item.status === 'recruiting').length,
      pendingLeaderApplications: leaderApplications.data.filter((item) => item.status === 'pending').length,
      pendingApplications: applications.data.filter((item) => item.status === 'pending').length,
    },
    warnings: [contests, teams, applications, leaderApplications].filter((item) => item.error).map((item) => item.error),
  }
}

export async function getAdminTeams() {
  const client = requireSupabase()
  const [{ data: teams, error }, { data: contests, error: contestError }, { data: members, error: memberError }, { data: teamMembers }, { data: applications }] = await Promise.all([
    client.from(TABLES.teams).select('*').order('id', { ascending: false }),
    client.from(TABLES.contests).select('*'),
    client.from(TABLES.members).select('*'),
    client.from(TABLES.teamMembers).select('*'),
    client.from(TABLES.applications).select('*'),
  ])
  throwIfError(error || contestError || memberError)
  const contestsById = byId(contests)
  const membersById = byId(members)
  return (teams ?? []).map((team) => ({
    ...team,
    contest: contestsById.get(team.contest_id),
    leader: membersById.get(team.leader_id),
    members: (teamMembers ?? []).filter((link) => Number(link.team_id) === Number(team.id)).map((link) => ({ ...link, member: membersById.get(link.member_id) })),
    applications: (applications ?? []).filter((app) => Number(app.team_id) === Number(team.id)),
    hasOpenChat: Boolean(team.open_chat_url),
    allMembers: members ?? [],
  }))
}

export async function updateAdminTeamStatus(teamId, status) {
  if (!['recruiting', 'matched'].includes(status)) throw new Error('DB에서 지원하지 않는 팀 상태입니다.')
  const patch = { status }
  if (status === 'matched') patch.closed_at = new Date().toISOString()
  if (status === 'recruiting') patch.closed_at = null
  const { data, error } = await requireSupabase().from(TABLES.teams).update(patch).eq('id', teamId).select('*').maybeSingle()
  throwIfError(error)
  return data
}

export async function deleteAdminTeamPost(teamId) {
  return deleteTeamPost(teamId, null, { admin: true })
}

export async function updateAdminTeamLeader(teamId, leaderId) {
  const { data, error } = await requireSupabase()
    .from(TABLES.teams)
    .update({ leader_id: Number(leaderId) })
    .eq('id', teamId)
    .select('*')
    .maybeSingle()
  throwIfError(error)
  return data
}

export async function addAdminTeamMember(teamId, memberId) {
  const client = requireSupabase()
  const { data: existing, error: existingError } = await client
    .from(TABLES.teamMembers)
    .select('*')
    .eq('team_id', teamId)
    .eq('member_id', memberId)
    .maybeSingle()
  throwIfError(existingError)

  if (existing?.id) {
    const { data, error } = await client
      .from(TABLES.teamMembers)
      .update(clean({ status: 'active', left_at: null, leave_reason: null, removed_by_member_id: null }))
      .eq('id', existing.id)
      .select('*')
      .maybeSingle()
    throwIfError(error)
    await refreshTeamMemberCount(teamId)
    return data
  }

  let { data, error } = await client
    .from(TABLES.teamMembers)
    .insert({ team_id: Number(teamId), member_id: Number(memberId), status: 'active' })
    .select('*')
    .maybeSingle()
  if (error && /status|schema cache|column/i.test(String(error.message))) {
    const fallback = await client
      .from(TABLES.teamMembers)
      .insert({ team_id: Number(teamId), member_id: Number(memberId) })
      .select('*')
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }
  throwIfError(error)
  await refreshTeamMemberCount(teamId)
  return data
}

export async function updateAdminTeamMemberStatus(linkId, status) {
  const client = requireSupabase()
  const { data: link, error: linkError } = await client.from(TABLES.teamMembers).select('*').eq('id', linkId).maybeSingle()
  throwIfError(linkError)
  if (!link) throw new Error('팀원 연결 정보를 찾지 못했습니다.')
  const patch = clean({
    status,
    left_at: status === 'active' ? null : new Date().toISOString(),
    leave_reason: status === 'active' ? null : '관리자 처리',
  })
  const { data, error } = await client.from(TABLES.teamMembers).update(patch).eq('id', linkId).select('*').maybeSingle()
  throwIfError(error)
  await refreshTeamMemberCount(link.team_id)
  return data
}

async function refreshTeamMemberCount(teamId) {
  const client = requireSupabase()
  const [{ data: team }, { data: links }] = await Promise.all([
    client.from(TABLES.teams).select('leader_id').eq('id', teamId).maybeSingle(),
    client.from(TABLES.teamMembers).select('member_id,status').eq('team_id', teamId),
  ])
  const activeIds = new Set((links ?? [])
    .filter((link) => !('status' in link) || !link.status || link.status === 'active')
    .map((link) => Number(link.member_id)))
  if (team?.leader_id) activeIds.add(Number(team.leader_id))
  await client.from(TABLES.teams).update({ current_members: Math.max(1, activeIds.size) }).eq('id', teamId)
}

export async function getAdminApplications() {
  const client = requireSupabase()
  const [{ data: applications, error }, { data: teams }, { data: contests }, { data: members }] = await Promise.all([
    client.from(TABLES.applications).select('*').order('id', { ascending: false }),
    client.from(TABLES.teams).select(TEAM_PUBLIC_FIELDS),
    client.from(TABLES.contests).select('*'),
    client.from(TABLES.members).select('*'),
  ])
  throwIfError(error)
  const teamsById = byId(teams)
  const contestsById = byId(contests)
  const membersById = byId(members)
  return (applications ?? []).map((application) => {
    const team = teamsById.get(application.team_id)
    return { ...application, team, contest: contestsById.get(team?.contest_id), applicant: membersById.get(application.applicant_id) }
  })
}

export async function getAdminMembers() {
  return getMembers()
}

export async function getAdminMemberStatsRows() {
  const [weatherRows, applications, teams, teamMembers, contests, attendance, promotion, peerReviews] = await Promise.all([
    getAdminActivityWeatherRows(),
    safeSelect(TABLES.applications).catch(() => []),
    safeSelect(TABLES.teams).catch(() => []),
    safeSelect(TABLES.teamMembers).catch(() => []),
    safeSelect(TABLES.contests).catch(() => []),
    getAdminAttendanceOverview().catch(() => emptyAdminOverview()),
    getAdminPromotionOverview().catch(() => emptyAdminOverview()),
    safeSelect(TABLES.peerReviews).catch(() => []),
  ])
  const teamsById = byId(teams)
  const contestsById = byId(contests)

  return weatherRows.map((member) => {
    const memberId = Number(member.id)
    const applicationRows = applications.filter((application) => Number(application.applicant_id) === memberId)
    const leaderTeams = teams.filter((team) => Number(team.leader_id) === memberId)
    const joinedTeamIds = new Set((teamMembers ?? [])
      .filter((link) => Number(link.member_id) === memberId && (!('status' in link) || !link.status || link.status === 'active'))
      .map((link) => Number(link.team_id)))
    leaderTeams.forEach((team) => joinedTeamIds.add(Number(team.id)))
    const legacyMember = findLegacyMemberFor(member, attendance.members)
    const attendanceRecords = (attendance.records ?? [])
      .filter((record) => sameExternalMember(record, legacyMember, member))
      .map((record) => ({ ...record, session: (attendance.sessions ?? []).find((session) => String(session.id) === String(record.session_id)) }))
    const promotionAssignments = (promotion.assignments ?? []).filter((row) => sameExternalMember(row, legacyMember, member))
    const promotionProofs = (promotion.proofs ?? []).filter((row) => sameExternalMember(row, legacyMember, member))
    const promotionProgress = (promotion.progress ?? []).find((row) => sameExternalMember(row, legacyMember, member)) ?? member.raw?.promotionData ?? null
    const contestApplications = applicationRows.map((application) => {
      const team = teamsById.get(application.team_id)
      return { ...application, team, contest: contestsById.get(team?.contest_id) }
    })
    const ownedTeams = leaderTeams.map((team) => ({ ...team, contest: contestsById.get(team.contest_id), role: '팀장' }))
    const joinedTeams = [...joinedTeamIds].map((teamId) => teamsById.get(teamId)).filter(Boolean).map((team) => ({
      ...team,
      contest: contestsById.get(team.contest_id),
      role: Number(team.leader_id) === memberId ? '팀장' : '팀원',
    }))
    const relatedPeerReviews = [
      ...(member.raw?.peerReviews ?? []),
      ...(peerReviews ?? []).filter((review) =>
        Number(review.reviewee_id ?? review.reviewed_member_id ?? review.member_id) === memberId
        || Number(review.reviewer_id) === memberId
      ),
    ].filter((review, index, rows) => rows.findIndex((item) => String(item.id ?? `${item.reviewer_id}-${item.reviewee_id}-${item.team_id}`) === String(review.id ?? `${review.reviewer_id}-${review.reviewee_id}-${review.team_id}`)) === index)

    return {
      ...member,
      legacyMember,
      promotionData: promotionProgress,
      promotionAssignments,
      promotionProofs,
      attendanceSummary: member.raw?.attendanceSummary ?? null,
      attendanceRecords,
      applicationCount: applicationRows.length,
      acceptedApplicationCount: applicationRows.filter((application) => application.status === 'accepted').length,
      pendingApplicationCount: applicationRows.filter((application) => application.status === 'pending').length,
      leaderTeamCount: leaderTeams.length,
      teamCount: joinedTeamIds.size,
      contestApplications,
      contestTeams: joinedTeams,
      ownedTeams,
      peerReviews: relatedPeerReviews,
    }
  })
}

// 임원진 직책명(position_title) 을 안전하게 읽어옵니다.
// 컬럼이 아직 없으면 빈 객체를 반환해 다른 조회/로그인에 영향을 주지 않습니다.
export async function getMemberPositions() {
  try {
    const { data, error } = await requireSupabase().from(TABLES.members).select('id,position_title')
    if (error) return {}
    const map = {}
    ;(data ?? []).forEach((row) => { map[row.id] = row.position_title || null })
    return map
  } catch {
    return {}
  }
}

export async function updateMemberAdminFields(memberId, patch) {
  const { data, error } = await requireSupabase().from(TABLES.members).update(clean(patch)).eq('id', memberId).select('*').maybeSingle()
  throwIfError(error)
  return data
}

export async function deleteAdminMember(memberId) {
  const client = requireSupabase()
  const id = Number(memberId)
  // 외래키(FK) 제약으로 삭제가 거절되지 않도록 연결 데이터를 먼저 정리합니다. (있을 때만, 실패 무시)
  await Promise.allSettled([
    client.from(TABLES.applications).delete().eq('applicant_id', id),
    client.from(TABLES.teamMembers).delete().eq('member_id', id),
    client.from(TABLES.leaderApplications).delete().eq('member_id', id),
    client.from(TABLES.notifications).delete().eq('member_id', id),
    client.from(TABLES.scoreEvents).delete().eq('member_id', id),
    client.from(TABLES.peerReviews).delete().eq('reviewer_id', id),
    client.from(TABLES.peerReviews).delete().eq('reviewee_id', id),
  ])
  const { data, error } = await client.from(TABLES.members).delete().eq('id', id).select('id')
  if (error) {
    // 팀장으로 등록된 팀이 있으면 teams.leader_id FK 때문에 막힙니다.
    if (/foreign key|violates|teams/i.test(String(error.message))) {
      throw new Error('이 회원이 팀장으로 등록된 팀이 있어 삭제가 막혔습니다. 해당 팀을 먼저 삭제하거나 팀장을 변경한 뒤 다시 시도해 주세요.')
    }
    throw error
  }
  assertDeleted(data)
  return true
}

export async function getAdminAnnouncements() { return safeSelect(TABLES.announcements) }
export async function createAnnouncement(values) {
  const announcement = await insertRow(TABLES.announcements, clean({
    title: values.title,
    body: values.content,
    is_published: values.is_published,
  }))
  if (values.sync_notification !== false && values.is_published !== false) {
    try {
      await insertRow(TABLES.notifications, clean({
        member_id: null,
        type: 'notice',
        title: values.title,
        body: values.content,
        href: '/announcements',
      }))
    } catch (error) {
      return { ...announcement, notificationWarning: error.message }
    }
  }
  return announcement
}
export async function updateAnnouncement(id, values) {
  return updateRow(TABLES.announcements, id, clean({
    title: values.title,
    body: values.content,
    is_published: values.is_published,
  }))
}

export async function getAdminNotifications() { return safeSelect(TABLES.notifications) }
export async function createNotification(values) {
  return insertRow(TABLES.notifications, clean({
    member_id: values.member_id ? Number(values.member_id) : null,
    type: values.type || 'notice',
    title: values.title,
    body: values.content,
    href: values.href,
  }))
}

export async function getAdminPeerReviews() {
  const [reviews, members, teams] = await Promise.all([safeSelect(TABLES.peerReviews), safeSelect(TABLES.members), safeSelect(TABLES.teams)])
  const membersById = byId(members)
  const teamsById = byId(teams)
  return reviews.map((review) => ({
    ...review,
    reviewer: membersById.get(review.reviewer_id),
    reviewee: membersById.get(review.reviewee_id ?? review.reviewed_member_id ?? review.member_id),
    team: teamsById.get(review.team_id),
  }))
}

export async function updateAdminPeerReviewStatus(reviewId, status) {
  const { data, error } = await requireSupabase()
    .from(TABLES.peerReviews)
    .update({ status })
    .eq('id', reviewId)
    .select('*')
    .maybeSingle()
  if (error) {
    throw new Error(`${error.message} · DB 컬럼 추가 필요: team_matching_peer_reviews.status`)
  }
  return data
}
export async function getAdminAwards() {
  const [awards, teams, contests] = await Promise.all([safeSelect(TABLES.awards), safeSelect(TABLES.teams), safeSelect(TABLES.contests)])
  const teamsById = byId(teams)
  const contestsById = byId(contests)
  return awards.map((award) => {
    const team = teamsById.get(award.team_id)
    return { ...award, team, contest: contestsById.get(award.contest_id ?? team?.contest_id) }
  })
}
export async function createAward(values) {
  return insertRow(TABLES.awards, clean({
    team_id: values.team_id ? Number(values.team_id) : null,
    contest_id: values.contest_id ? Number(values.contest_id) : null,
    award_result: values.award_result,
  }))
}
export async function updateAward(id, values) {
  return updateRow(TABLES.awards, id, clean({
    team_id: values.team_id ? Number(values.team_id) : null,
    contest_id: values.contest_id ? Number(values.contest_id) : null,
    award_result: values.award_result,
  }))
}

export async function deleteAward(id) {
  const { data, error } = await requireSupabase().from(TABLES.awards).delete().eq('id', id).select('id')
  throwIfError(error)
  assertDeleted(data)
  return true
}

export async function getAdminActivityWeatherRows() {
  const members = await getMembers()
  const rows = await getAllActivityWeather(members)
  return rows.sort((a, b) => (b.activityWeather.score ?? -1) - (a.activityWeather.score ?? -1))
}

export async function createScoreEvent(values) {
  return insertRow(TABLES.scoreEvents, clean({
    member_id: Number(values.member_id),
    event_type: values.event_type || 'offline',
    points: Number(values.score_delta ?? values.points ?? 0),
    verified: Boolean(values.verified),
    metadata: clean({ reason: values.reason }),
  }))
}

export async function createAttendanceSession(values) {
  return insertRow('activity_sessions', clean({
    title: values.title,
    location: values.location,
    starts_at: toIso(values.starts_at),
    ends_at: toIso(values.ends_at),
    status: values.status || 'scheduled',
    attendance_code_enabled: values.attendance_code_enabled !== false,
    attendance_code: values.attendance_code,
    attendance_open_at: toIso(values.attendance_open_at),
    attendance_close_at: toIso(values.attendance_close_at),
    base_points: values.base_points ? Number(values.base_points) : 1,
  }))
}

export async function updateAttendanceSession(id, values) {
  return updateRow('activity_sessions', id, clean({
    title: values.title,
    location: values.location,
    starts_at: toIso(values.starts_at),
    ends_at: toIso(values.ends_at),
    status: values.status || 'scheduled',
    attendance_code_enabled: values.attendance_code_enabled !== false,
    attendance_code: values.attendance_code,
    attendance_open_at: toIso(values.attendance_open_at),
    attendance_close_at: toIso(values.attendance_close_at),
    base_points: values.base_points ? Number(values.base_points) : 1,
  }))
}

export async function deleteAttendanceSession(id) {
  const client = requireSupabase()
  await client.from('activity_attendance_records').delete().eq('session_id', id)
  const { data, error } = await client.from('activity_sessions').delete().eq('id', id).select('id')
  throwIfError(error)
  assertDeleted(data)
  return true
}

export async function setAttendanceRecordStatus({ sessionId, memberId, status, points = 1 }) {
  const client = requireSupabase()
  const { data: existing, error: findError } = await client
    .from('activity_attendance_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('member_id', memberId)
    .maybeSingle()
  throwIfError(findError)
  const payload = clean({
    session_id: sessionId,
    member_id: memberId,
    status,
    checked_at: new Date().toISOString(),
    points: status === 'present' ? Number(points || 1) : 0,
  })
  if (existing?.id) return updateRow('activity_attendance_records', existing.id, payload)
  return insertRow('activity_attendance_records', payload)
}

export async function clearAttendanceCode(sessionId) {
  return updateRow('activity_sessions', sessionId, {
    attendance_code: null,
    attendance_code_enabled: false,
  })
}

async function safeSelect(table) {
  let { data, error } = await requireSupabase().from(table).select('*').order('id', { ascending: false })
  if (error && String(error.message).includes('id')) {
    const fallback = await requireSupabase().from(table).select('*')
    data = fallback.data
    error = fallback.error
  }
  throwIfError(error)
  return data ?? []
}

async function safeSelectSoft(table, orderColumn = 'id') {
  try {
    let query = requireSupabase().from(table).select('*')
    if (orderColumn) query = query.order(orderColumn, { ascending: false })
    const { data, error } = await query
    if (error && orderColumn) {
      const fallback = await requireSupabase().from(table).select('*')
      if (fallback.error) return { data: [], error: `${table}: ${fallback.error.message}` }
      return { data: fallback.data ?? [], error: null }
    }
    if (error) return { data: [], error: `${table}: ${error.message}` }
    return { data: data ?? [], error: null }
  } catch (error) {
    return { data: [], error: `${table}: ${error.message}` }
  }
}

function emptyAdminOverview() {
  return { sessions: [], records: [], summary: [], members: [], assignments: [], missions: [], proofs: [], progress: [], warnings: [] }
}

async function insertRow(table, payload) {
  const { data, error } = await requireSupabase().from(table).insert(payload).select('*').maybeSingle()
  throwIfError(error)
  return data
}

async function updateRow(table, id, payload) {
  const { data, error } = await requireSupabase().from(table).update(payload).eq('id', id).select('*').maybeSingle()
  throwIfError(error)
  return data
}

// 삭제 결과를 검증합니다. RLS/권한 때문에 에러 없이 0건 삭제되는 경우를 잡아냅니다.
function assertDeleted(rows) {
  if (!rows || rows.length === 0) {
    throw new Error('DB에서 삭제되지 않았습니다(권한 차단). Supabase SQL Editor에서 prototype-write-access.sql 을 실행해 삭제 권한을 열어주세요.')
  }
}

function clean(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== ''))
}
function byId(rows = []) { return new Map((rows ?? []).map((row) => [row.id, row])) }
function sortDesc(rows = []) { return [...rows].sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0)) }
function sameMember(row, memberId) {
  const id = row.member_id ?? row.reviewee_id ?? row.reviewed_member_id ?? row.recipient_member_id ?? row.awardee_id
  return Number(id) === Number(memberId)
}
function toIso(value) { return value ? new Date(value).toISOString() : undefined }

function findLegacyMemberFor(member, legacyMembers = []) {
  if (!member) return null
  if (member.mast_member_id) {
    const direct = (legacyMembers ?? []).find((row) => String(row.id) === String(member.mast_member_id))
    if (direct) return direct
  }
  const name = normalizeKey(member.name)
  const school = normalizeKey(member.school)
  const generation = generationNumber(member.generation)
  return (legacyMembers ?? []).find((row) => {
    const nameMatched = normalizeKey(row.name) === name
    const schoolMatched = !school || normalizeKey(row.school) === school
    const giMatched = !generation || generationNumber(row.gi ?? row.generation) === generation
    return nameMatched && schoolMatched && giMatched
  }) ?? null
}

function sameExternalMember(row, legacyMember, teamMatchingMember) {
  const candidates = [
    legacyMember?.id,
    teamMatchingMember?.mast_member_id,
    teamMatchingMember?.id,
  ].filter((value) => value !== undefined && value !== null && value !== '').map(String)
  const rowIds = [
    row?.member_id,
    row?.assignee_id,
    row?.assigned_member_id,
    row?.target_member_id,
    row?.user_id,
    row?.profile_id,
    row?.mast_member_id,
    row?.team_matching_member_id,
  ].filter((value) => value !== undefined && value !== null && value !== '').map(String)
  if (rowIds.some((value) => candidates.includes(value))) return true
  if (teamMatchingMember?.name && row?.member_name) {
    const nameMatched = normalizeKey(row.member_name) === normalizeKey(teamMatchingMember.name)
    const schoolMatched = !teamMatchingMember.school || !row.school || normalizeKey(row.school) === normalizeKey(teamMatchingMember.school)
    const giMatched = !teamMatchingMember.generation || !row.gi || generationNumber(row.gi) === generationNumber(teamMatchingMember.generation)
    return nameMatched && schoolMatched && giMatched
  }
  return false
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function generationNumber(value) {
  return String(value ?? '').replace(/[^0-9]/g, '')
}
