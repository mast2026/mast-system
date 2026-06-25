import { TABLES, requireSupabase, throwIfError } from './baseService'
import { canCreateTeamForContest, parseLeaderApplicationContestId } from './leaderService'
import { isContestOpen } from './contestService'

let capabilityPromise
export const TEAM_PUBLIC_FIELDS = 'id,contest_id,leader_id,required_members,current_members,introduction,prize_distribution,needed_roles,work_style,meeting_style,interest_areas,personality_tags,skill_tags,status,closed_at'
export function detectTeamCapabilities() {
  if (!capabilityPromise) capabilityPromise = (async () => {
    const client = requireSupabase()
    const [chat, status, leftAt, reason, removedBy] = await Promise.all([
      client.from(TABLES.teams).select('open_chat_url').limit(1),
      client.from(TABLES.teamMembers).select('status').limit(1),
      client.from(TABLES.teamMembers).select('left_at').limit(1),
      client.from(TABLES.teamMembers).select('leave_reason').limit(1),
      client.from(TABLES.teamMembers).select('removed_by_member_id').limit(1),
    ])
    return {
      openChat: !chat.error,
      membershipStatus: !status.error,
      membershipOperations: !status.error && !leftAt.error && !reason.error && !removedBy.error,
    }
  })()
  return capabilityPromise
}

const activeLink = (link, hasStatus) => !hasStatus || link.status === 'active'
const withoutChat = (team) => { const { open_chat_url: _private, ...safe } = team; return safe }

export async function getRecruitingTeams() { return getEnrichedTeams({ recruitingOnly: true }) }
export async function getEnrichedTeams({ recruitingOnly = false } = {}) {
  const client = requireSupabase(); let teamsQuery = client.from(TABLES.teams).select(TEAM_PUBLIC_FIELDS).order('id', { ascending: false })
  if (recruitingOnly) teamsQuery = teamsQuery.eq('status', 'recruiting')
  const [{ data: teams, error }, { data: contests, error: contestError }, { data: members, error: memberError }, { data: teamLinks, error: linksError }] = await Promise.all([teamsQuery, client.from(TABLES.contests).select('*'), client.from(TABLES.members).select('*'), client.from(TABLES.teamMembers).select('team_id,member_id,status')])
  throwIfError(error || contestError || memberError || linksError); const contestsById = new Map((contests ?? []).map((x) => [x.id, x])); const membersById = new Map((members ?? []).map((x) => [x.id, x]))
  return (teams ?? [])
    .map(withoutChat)
    .map((team) => ({ ...team, current_members: effectiveMemberCount(team, teamLinks), contest: contestsById.get(team.contest_id), leader: membersById.get(team.leader_id) }))
    .filter((team) => !recruitingOnly || (team.contest?.is_active !== false && isContestOpen(team.contest)))
}

export async function getTeamDetail(teamId, viewerId) {
  const client = requireSupabase(); const capabilities = await detectTeamCapabilities(); const membershipFields = capabilities.membershipStatus ? 'id,team_id,member_id,status' : 'id,team_id,member_id'
  const [{ data: team, error }, { data: links, error: linkError }, { data: members, error: memberError }] = await Promise.all([
    client.from(TABLES.teams).select(TEAM_PUBLIC_FIELDS).eq('id', teamId).maybeSingle(), client.from(TABLES.teamMembers).select(membershipFields).eq('team_id', teamId), client.from(TABLES.members).select('*'),
  ])
  throwIfError(error || linkError || memberError); if (!team) return null
  const membersById = new Map((members ?? []).map((x) => [x.id, x])); const activeLinks = (links ?? []).filter((link) => activeLink(link, capabilities.membershipStatus))
  const viewerLink = activeLinks.find((link) => link.member_id === viewerId); const canViewChat = team.leader_id === viewerId || Boolean(viewerLink)
  const { data: contest, error: contestError } = await client.from(TABLES.contests).select('*').eq('id', team.contest_id).maybeSingle(); throwIfError(contestError)
  let open_chat_url
  if (canViewChat && capabilities.openChat) { const { data: chat, error: chatError } = await client.from(TABLES.teams).select('open_chat_url').eq('id', teamId).maybeSingle(); throwIfError(chatError); open_chat_url = chat?.open_chat_url }
  const leader = membersById.get(team.leader_id)
  const activeMembers = activeLinks.map((x) => membersById.get(x.member_id)).filter(Boolean)
  const teamMembers = leader ? [leader, ...activeMembers.filter((item) => Number(item.id) !== Number(team.leader_id))] : activeMembers
  return { ...team, current_members: effectiveMemberCount(team, activeLinks), ...(canViewChat && capabilities.openChat ? { open_chat_url } : {}), contest, leader, teamMemberships: activeLinks.map((link) => ({ ...link, member: membersById.get(link.member_id) })).filter((x) => x.member), teamMembers, viewerIsActiveMember: Boolean(viewerLink), canViewChat, capabilities }
}

export async function createTeam(member, values) {
  const contestId = Number(values.contest_id)
  if (!await canCreateTeamForContest(member?.id, contestId)) throw new Error('해당 공모전의 팀장 신청이 승인된 회원만 팀 공고를 만들 수 있습니다.')
  const client = requireSupabase(); const capabilities = await detectTeamCapabilities()
  const payload = { contest_id: contestId, leader_id: member.id, required_members: Number(values.required_members), current_members: 1, introduction: values.introduction, prize_distribution: values.prize_distribution, needed_roles: values.needed_roles, work_style: values.work_style, meeting_style: values.meeting_style, interest_areas: values.interest_areas, personality_tags: values.personality_tags, skill_tags: values.skill_tags, status: 'recruiting' }
  if (capabilities.openChat && values.open_chat_url?.trim()) {
    const trimmed = values.open_chat_url.trim()
    try {
      const parsed = new URL(trimmed)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    } catch {
      throw new Error('올바른 오픈채팅 URL을 입력해 주세요.')
    }
    payload.open_chat_url = trimmed
  }
  const { data: team, error } = await client.from(TABLES.teams).insert(payload).select('*').single(); throwIfError(error)
  const membership = { team_id: team.id, member_id: member.id }; if (capabilities.membershipStatus) membership.status = 'active'
  const { error: linkError } = await client.from(TABLES.teamMembers).insert(membership)
  if (linkError) { await client.from(TABLES.teams).delete().eq('id', team.id); throw linkError }
  return team
}

export async function updateTeamPost(teamId, leaderId, values) {
  const client = requireSupabase()
  const capabilities = await detectTeamCapabilities()
  const payload = cleanTeamPayload(values, capabilities)
  const { data, error } = await client
    .from(TABLES.teams)
    .update(payload)
    .eq('id', teamId)
    .eq('leader_id', leaderId)
    .select('*')
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('이 팀 공고를 수정할 권한이 없습니다.')
  return data
}

export async function deleteTeamPost(teamId, actor, { admin = false } = {}) {
  const client = requireSupabase()
  const { data: team, error: teamError } = await client.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle()
  throwIfError(teamError)
  if (!team) throw new Error('삭제할 팀 공고를 찾지 못했습니다.')
  if (!admin && Number(team.leader_id) !== Number(actor?.id)) throw new Error('팀장만 이 팀 공고를 삭제할 수 있습니다.')

  await Promise.allSettled([
    client.from(TABLES.applications).delete().eq('team_id', teamId),
    client.from(TABLES.teamMembers).delete().eq('team_id', teamId),
  ])

  const { data: deleted, error } = await client.from(TABLES.teams).delete().eq('id', teamId).select('id')
  if (error) {
    if (/foreign key|violates|constraint/i.test(String(error.message))) {
      throw new Error('결과/동료평가/수상 내역이 연결된 팀은 해당 기록을 먼저 정리한 뒤 삭제할 수 있습니다.')
    }
    throw error
  }
  if (!deleted || deleted.length === 0) {
    throw new Error('DB에서 팀이 삭제되지 않았습니다(권한 차단). Supabase에서 prototype-write-access.sql 을 실행해 주세요.')
  }

  // 승인된 팀장 신청에서 팀을 자동 생성하는 로직 때문에, 근원이 된 승인 신청을 정리하지 않으면
  // 화면을 다시 열 때 팀이 자동 재생성됩니다. 삭제가 유지되도록 해당 승인 신청을 함께 제거합니다.
  try {
    const { data: leaderApps } = await client
      .from(TABLES.leaderApplications)
      .select('*')
      .eq('member_id', team.leader_id)
      .eq('status', 'accepted')
    const targetIds = (leaderApps ?? [])
      .filter((application) => Number(parseLeaderApplicationContestId(application)) === Number(team.contest_id))
      .map((application) => application.id)
    if (targetIds.length) {
      await client.from(TABLES.leaderApplications).delete().in('id', targetIds)
    }
  } catch {
    /* 자동 재생성 방지용 정리 실패는 삭제 자체를 막지 않음 */
  }
  return true
}

function cleanTeamPayload(values, capabilities = {}) {
  const payload = {}
  if ('required_members' in values) payload.required_members = Number(values.required_members)
  if ('introduction' in values) payload.introduction = values.introduction || ''
  if ('prize_distribution' in values) payload.prize_distribution = values.prize_distribution || ''
  if ('needed_roles' in values) payload.needed_roles = values.needed_roles ?? []
  if ('work_style' in values) payload.work_style = values.work_style || ''
  if ('meeting_style' in values) payload.meeting_style = values.meeting_style || ''
  if ('interest_areas' in values) payload.interest_areas = values.interest_areas ?? []
  if ('personality_tags' in values) payload.personality_tags = values.personality_tags ?? []
  if ('skill_tags' in values) payload.skill_tags = values.skill_tags ?? []
  if (capabilities.openChat && 'open_chat_url' in values) {
    const trimmed = String(values.open_chat_url || '').trim()
    if (trimmed) {
      try {
        const parsed = new URL(trimmed)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      } catch {
        throw new Error('올바른 오픈채팅 URL을 입력해 주세요.')
      }
    }
    payload.open_chat_url = trimmed || null
  }
  return payload
}

export async function getMyTeams(memberId) {
  const client = requireSupabase(); const capabilities = await detectTeamCapabilities()
  const { data: links, error: linkError } = await client.from(TABLES.teamMembers).select('*').eq('member_id', memberId); throwIfError(linkError)
  const activeIds = new Set((links ?? []).filter((x) => activeLink(x, capabilities.membershipStatus)).map((x) => x.team_id))
  const pendingLeaveIds = new Set((links ?? []).filter((x) => x.status === 'leave_requested').map((x) => x.team_id))
  const ids = [...new Set([...activeIds, ...pendingLeaveIds])]
  let teamQuery = client.from(TABLES.teams).select('*').order('id', { ascending: false }); teamQuery = ids.length ? teamQuery.or(`leader_id.eq.${memberId},id.in.(${ids.join(',')})`) : teamQuery.eq('leader_id', memberId)
  const [{ data: teams, error }, { data: contests, error: contestError }, { data: allLinks, error: allLinksError }] = await Promise.all([teamQuery, client.from(TABLES.contests).select('*'), client.from(TABLES.teamMembers).select('team_id,member_id,status')])
  throwIfError(error || contestError || allLinksError); const contestsById = new Map((contests ?? []).map((x) => [x.id, x]))
  return (teams ?? []).map((team) => ({ ...team, current_members: effectiveMemberCount(team, allLinks), contest: contestsById.get(team.contest_id), viewerIsActiveMember: activeIds.has(team.id), pendingLeave: pendingLeaveIds.has(team.id), canViewChat: team.leader_id === memberId || activeIds.has(team.id), capabilities }))
}

export async function getTeamManagement(teamId, leaderId) {
  const team = await getTeamDetail(teamId, leaderId)
  if (!team || team.leader_id !== leaderId) throw new Error('이 팀을 관리할 권한이 없습니다.')
  return team
}

export async function updateOpenChatUrl(teamId, leaderId, openChatUrl) {
  const capabilities = await detectTeamCapabilities()
  // DB 컬럼 추가 필요: team_matching_teams.open_chat_url이 없으면 UI와 저장을 비활성화합니다.
  if (!capabilities.openChat) throw new Error('DB에 open_chat_url 컬럼 추가가 필요합니다.')
  const trimmed = openChatUrl.trim()
  if (trimmed) { let parsed; try { parsed = new URL(trimmed) } catch { throw new Error('올바른 오픈채팅 URL을 입력해 주세요.') } if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('http 또는 https 링크만 등록할 수 있습니다.') }
  const { data, error } = await requireSupabase().from(TABLES.teams).update({ open_chat_url: trimmed || null }).eq('id', teamId).eq('leader_id', leaderId).select('*').maybeSingle()
  throwIfError(error); if (!data) throw new Error('이 팀을 수정할 권한이 없습니다.'); return data
}

async function changeMemberStatus({ teamId, memberId, actorId, status, reason }) {
  const client = requireSupabase(); const capabilities = await detectTeamCapabilities()
  // DB 컬럼 추가 필요: status, left_at, leave_reason, removed_by_member_id가 없으면 나가기/제외 UI를 비활성화합니다.
  if (!capabilities.membershipOperations) throw new Error('DB에 팀원 상태 관리 컬럼 추가가 필요합니다.')
  const { data: team, error: teamError } = await client.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle(); throwIfError(teamError); if (!team) throw new Error('팀을 찾을 수 없습니다.')
  if (memberId === team.leader_id) throw new Error('팀장은 팀 나가기 또는 제외 대상이 될 수 없습니다.')
  if (status === 'removed' && actorId !== team.leader_id) throw new Error('팀장만 팀원을 제외할 수 있습니다.')
  if (status === 'left' && actorId !== memberId) throw new Error('본인만 팀에서 나갈 수 있습니다.')
  const { data: membership, error: linkError } = await client.from(TABLES.teamMembers).select('*').eq('team_id', teamId).eq('member_id', memberId).eq('status', 'active').maybeSingle(); throwIfError(linkError)
  if (!membership) throw new Error('이미 나갔거나 제외된 팀원입니다.')
  const patch = { status, left_at: new Date().toISOString(), leave_reason: reason }; if (status === 'removed') patch.removed_by_member_id = actorId
  const { data: changed, error: updateError } = await client.from(TABLES.teamMembers).update(patch).eq('id', membership.id).eq('status', 'active').select('id').maybeSingle(); throwIfError(updateError)
  if (!changed) throw new Error('이미 나갔거나 제외된 팀원입니다.')
  const { count, error: countMembersError } = await client.from(TABLES.teamMembers).select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'active')
  if (countMembersError) { await client.from(TABLES.teamMembers).update({ status: 'active', left_at: null, leave_reason: null, removed_by_member_id: null }).eq('id', membership.id); throw countMembersError }
  const { count: leaderCount, error: leaderCountError } = await client.from(TABLES.teamMembers).select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('member_id', team.leader_id).eq('status', 'active')
  if (leaderCountError) { await client.from(TABLES.teamMembers).update({ status: 'active', left_at: null, leave_reason: null, removed_by_member_id: null }).eq('id', membership.id); throw leaderCountError }
  const nextCount = Math.max(1, Number(count ?? 0) + (leaderCount ? 0 : 1))
  const { error: countError } = await client.from(TABLES.teams).update({ current_members: nextCount }).eq('id', teamId)
  if (countError) { await client.from(TABLES.teamMembers).update({ status: 'active', left_at: null, leave_reason: null, removed_by_member_id: null }).eq('id', membership.id); throw countError }
  await notifyAdminsOfTeamExit(client, { team, memberId, actorId, status, reason })
  return nextCount
}

export const leaveTeam = (teamId, memberId, reason) => changeMemberStatus({ teamId, memberId, actorId: memberId, status: 'left', reason })
export const removeTeamMember = (teamId, memberId, leaderId, reason) => changeMemberStatus({ teamId, memberId, actorId: leaderId, status: 'removed', reason })

// 탈퇴는 즉시 처리하지 않고 신청 → 관리자 승인 구조. 본인(팀원)이 신청합니다.
export async function requestLeaveTeam(teamId, memberId, reason) {
  const client = requireSupabase()
  const capabilities = await detectTeamCapabilities()
  if (!capabilities.membershipOperations) throw new Error('DB에 팀원 상태 관리 컬럼 추가가 필요합니다.')
  if (!reason || !reason.trim()) throw new Error('탈퇴 사유를 입력해 주세요.')
  const { data: team, error: teamError } = await client.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle()
  throwIfError(teamError)
  if (!team) throw new Error('팀을 찾을 수 없습니다.')
  if (Number(memberId) === Number(team.leader_id)) throw new Error('팀장은 탈퇴 신청 대상이 아닙니다.')
  const { data: membership, error: linkError } = await client.from(TABLES.teamMembers)
    .select('*').eq('team_id', teamId).eq('member_id', memberId).eq('status', 'active').maybeSingle()
  throwIfError(linkError)
  if (!membership) throw new Error('활동 중인 팀원이 아니거나 이미 탈퇴 신청한 상태입니다.')
  const { data: changed, error } = await client.from(TABLES.teamMembers)
    .update({ status: 'leave_requested', leave_reason: reason.trim() })
    .eq('id', membership.id).eq('status', 'active').select('id').maybeSingle()
  throwIfError(error)
  if (!changed) throw new Error('이미 처리된 신청입니다.')
  await notifyAdminsOfTeamExit(client, { team, memberId, actorId: memberId, status: 'leave_requested', reason })
  return true
}

export async function setRecruitmentStatus(teamId, leaderId, status) {
  if (!['recruiting', 'closed'].includes(status)) throw new Error('지원하지 않는 모집 상태입니다.')
  const client = requireSupabase(); const { data: team, error } = await client.from(TABLES.teams).select('*').eq('id', teamId).eq('leader_id', leaderId).maybeSingle(); throwIfError(error); if (!team) throw new Error('이 팀을 관리할 권한이 없습니다.')
  if (status === 'recruiting' && Number(team.current_members) >= Number(team.required_members)) throw new Error('현재 정원이 가득 차 있어 모집을 다시 열 수 없습니다.')
  const patch = status === 'recruiting' ? { status, closed_at: null } : { status, closed_at: new Date().toISOString() }
  const { error: updateError } = await client.from(TABLES.teams).update(patch).eq('id', teamId).eq('leader_id', leaderId); throwIfError(updateError)
}

export async function submitTeamMatchingComplete(teamId, leaderId) {
  const client = requireSupabase()
  const { data: team, error } = await client.from(TABLES.teams).select('*').eq('id', teamId).eq('leader_id', leaderId).maybeSingle()
  throwIfError(error)
  if (!team) throw new Error('이 팀을 관리할 권한이 없습니다.')
  if (team.status === 'matched') throw new Error('이미 팀매칭 완료 제출된 팀입니다.')
  const { error: updateError } = await client.from(TABLES.teams).update({ status: 'matched', closed_at: new Date().toISOString() }).eq('id', teamId).eq('leader_id', leaderId)
  throwIfError(updateError)
}

async function notifyAdminsOfTeamExit(client, { team, memberId, actorId, status, reason }) {
  try {
    const [{ data: admins }, { data: member }, { data: actor }, { data: contest }] = await Promise.all([
      client.from(TABLES.members).select('id').in('role', ['admin', 'manager', 'professor']),
      client.from(TABLES.members).select('name').eq('id', memberId).maybeSingle(),
      client.from(TABLES.members).select('name').eq('id', actorId).maybeSingle(),
      client.from(TABLES.contests).select('title').eq('id', team.contest_id).maybeSingle(),
    ])
    const payloads = (admins ?? []).map((admin) => ({
      member_id: admin.id,
      type: status === 'leave_requested' ? 'team_leave_requested' : status === 'left' ? 'team_member_left' : 'team_member_removed',
      title: status === 'leave_requested' ? '팀원이 탈퇴를 신청했습니다.' : status === 'left' ? '팀원이 팀을 탈퇴했습니다.' : '팀원이 제외되었습니다.',
      body: `${contest?.title || '공모전'} / 팀 ${team.id}\n대상: ${member?.name || memberId}\n처리자: ${actor?.name || actorId}\n사유: ${reason || '-'}`,
      href: status === 'leave_requested' ? '/admin/leave-requests' : '/admin/teams',
    }))
    if (payloads.length) await client.from(TABLES.notifications).insert(payloads)
  } catch (error) {
    console.warn('관리자 탈퇴 알림 생성 실패:', error?.message || error)
  }
}

function effectiveMemberCount(team, links = []) {
  const activeIds = new Set((links ?? [])
    .filter((link) => Number(link.team_id) === Number(team.id) && (!Object.prototype.hasOwnProperty.call(link, 'status') || link.status === 'active'))
    .map((link) => Number(link.member_id)))
  activeIds.add(Number(team.leader_id))
  return Math.max(1, activeIds.size)
}
