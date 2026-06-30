import { TABLES, requireSupabase, throwIfError } from './baseService'
import { detectTeamCapabilities, TEAM_PUBLIC_FIELDS } from './teamService'
import { ensureTeamsForAcceptedLeaderApplications, getMyLeaderApplications } from './leaderService'

let applicationCapabilityPromise

async function detectApplicationCapabilities() {
  if (!applicationCapabilityPromise) {
    applicationCapabilityPromise = (async () => {
      const { error } = await requireSupabase().from(TABLES.applications).select('leader_priority').limit(1)
      return { leaderPriority: !error }
    })()
  }
  return applicationCapabilityPromise
}

export async function getExistingApplication(teamId, applicantId) {
  const { data, error } = await requireSupabase().from(TABLES.applications).select('*').eq('team_id', teamId).eq('applicant_id', applicantId).order('id', { ascending: false }).limit(1).maybeSingle(); throwIfError(error); return data
}
export async function submitApplication(teamId, applicantId, values) {
  const client = requireSupabase()
  const { data: team, error: teamError } = await client.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle()
  throwIfError(teamError)
  if (!team) throw new Error('지원할 팀을 찾을 수 없습니다.')
  if (team.status !== 'recruiting') throw new Error('현재 모집 중인 팀이 아닙니다.')
  if (Number(team.leader_id) === Number(applicantId)) throw new Error('본인이 만든 팀에는 지원할 수 없습니다.')
  const { data: activeMembership, error: membershipError } = await client.from(TABLES.teamMembers).select('id').eq('team_id', teamId).eq('member_id', applicantId).eq('status', 'active').maybeSingle()
  throwIfError(membershipError)
  if (activeMembership) throw new Error('이미 참여 중인 팀입니다.')
  const [{ count: memberCount, error: memberCountError }, { count: leaderCount, error: leaderCountError }] = await Promise.all([
    client.from(TABLES.teamMembers).select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'active'),
    client.from(TABLES.teamMembers).select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('member_id', team.leader_id).eq('status', 'active'),
  ])
  throwIfError(memberCountError || leaderCountError)
  if (Number(memberCount ?? 0) + (leaderCount ? 0 : 1) >= Number(team.required_members)) throw new Error('모집 정원이 이미 마감되었습니다.')
  if (await getExistingApplication(teamId, applicantId)) throw new Error('이미 지원한 팀입니다.')

  const { data: contest, error: contestError } = await client.from(TABLES.contests).select('duplicate_allowed').eq('id', team.contest_id).maybeSingle()
  throwIfError(contestError)
  if (contest?.duplicate_allowed === false) {
    const [{ data: contestTeams, error: contestTeamsError }, { data: applicantApplications, error: applicationsError }] = await Promise.all([
      client.from(TABLES.teams).select('id').eq('contest_id', team.contest_id),
      client.from(TABLES.applications).select('team_id,status').eq('applicant_id', applicantId).in('status', ['pending', 'accepted']),
    ])
    throwIfError(contestTeamsError || applicationsError)
    const contestTeamIds = new Set((contestTeams ?? []).map((item) => Number(item.id)))
    if ((applicantApplications ?? []).some((item) => contestTeamIds.has(Number(item.team_id)))) {
      throw new Error('이 공모전은 여러 팀에 중복 지원할 수 없습니다.')
    }
  }
  const capabilities = await detectApplicationCapabilities()
  const payload = { team_id: Number(teamId), applicant_id: applicantId, survey_purpose: values.survey_purpose, survey_intensity: values.survey_intensity, survey_role: values.survey_role, survey_experience: values.survey_experience, survey_strengths: values.survey_strengths, survey_team_style: values.survey_team_style, capability_appeal: values.capability_appeal, personality_tags: values.personality_tags, skill_tags: values.skill_tags, availability_note: values.availability_note, message: values.message, status: 'pending' }
  // leader_priority 가 정수 컬럼이면 '' 입력 시 오류가 나므로, 값이 있을 때만 전송
  if (capabilities.leaderPriority && values.leader_priority !== undefined && values.leader_priority !== null && String(values.leader_priority).trim() !== '') {
    payload.leader_priority = values.leader_priority
  }
  // 전화번호 + 공개 동의 (동의한 팀의 팀장만 열람). 컬럼 미생성 시 전화번호 없이 재시도.
  payload.phone = values.phone ? String(values.phone).trim() : null
  payload.phone_consent = Boolean(values.phone_consent)
  let { data, error } = await client.from(TABLES.applications).insert(payload).select('*').single()
  if (error && /phone/i.test(error.message || '')) {
    const rest = { ...payload }
    delete rest.phone
    delete rest.phone_consent
    ;({ data, error } = await client.from(TABLES.applications).insert(rest).select('*').single())
  }
  throwIfError(error); return data
}
export async function getLeaderApplicationsForTeam(teamId, leaderId) {
  const client = requireSupabase(); const { data: team, error: teamError } = await client.from(TABLES.teams).select('*').eq('id', teamId).eq('leader_id', leaderId).maybeSingle(); throwIfError(teamError); if (!team) throw new Error('이 팀의 지원자를 관리할 권한이 없습니다.')
  const [{ data: applications, error }, { data: members, error: memberError }] = await Promise.all([client.from(TABLES.applications).select('*').eq('team_id', teamId).order('id', { ascending: false }), client.from(TABLES.members).select('*')]); throwIfError(error || memberError)
  const byId = new Map((members ?? []).map((x) => [x.id, x])); return (applications ?? []).map((x) => ({ ...x, applicant: byId.get(x.applicant_id) }))
}
export async function decideApplication(applicationId, leaderId, decision, rejectReason = '') {
  if (!['accepted', 'rejected'].includes(decision)) throw new Error('지원하지 않는 처리 상태입니다.')
  const client = requireSupabase(); const capabilities = await detectTeamCapabilities(); const { data: application, error } = await client.from(TABLES.applications).select('*').eq('id', applicationId).eq('status', 'pending').maybeSingle(); throwIfError(error); if (!application) throw new Error('이미 처리되었거나 존재하지 않는 지원서입니다.')
  const { data: team, error: teamError } = await client.from(TABLES.teams).select('*').eq('id', application.team_id).eq('leader_id', leaderId).maybeSingle(); throwIfError(teamError); if (!team) throw new Error('이 지원서를 처리할 권한이 없습니다.')
  if (decision === 'rejected') { if (!rejectReason.trim()) throw new Error('거절 사유를 입력해 주세요.'); const { data: rejected, error: rejectError } = await client.from(TABLES.applications).update({ status: 'rejected', reject_reason: rejectReason.trim() }).eq('id', applicationId).eq('status', 'pending').select('id').maybeSingle(); throwIfError(rejectError); if (!rejected) throw new Error('다른 사용자가 먼저 처리한 지원서입니다.'); await notifyApplicationResult(client, application, team, 'rejected', rejectReason.trim()); return }
  const { data: existing, error: existingError } = await client.from(TABLES.teamMembers).select('*').eq('team_id', team.id).eq('member_id', application.applicant_id).maybeSingle(); throwIfError(existingError); let inserted = false; let reactivated = false
  let activeCountQuery = client.from(TABLES.teamMembers).select('*', { count: 'exact', head: true }).eq('team_id', team.id); if (capabilities.membershipStatus) activeCountQuery = activeCountQuery.eq('status', 'active')
  const { count: activeCount, error: activeCountError } = await activeCountQuery; throwIfError(activeCountError)
  const { count: leaderMembershipCount, error: leaderMembershipError } = await client.from(TABLES.teamMembers).select('*', { count: 'exact', head: true }).eq('team_id', team.id).eq('member_id', team.leader_id).eq('status', 'active'); throwIfError(leaderMembershipError)
  const effectiveActiveCount = Number(activeCount ?? 0) + (leaderMembershipCount ? 0 : 1)
  if ((!existing || existing.status !== 'active') && effectiveActiveCount >= Number(team.required_members)) throw new Error('이미 팀 정원이 가득 찼습니다.')
  if (!existing) { const membership = { team_id: team.id, member_id: application.applicant_id }; if (capabilities.membershipStatus) membership.status = 'active'; const { error: insertError } = await client.from(TABLES.teamMembers).insert(membership); throwIfError(insertError); inserted = true }
  else if (capabilities.membershipStatus && existing.status !== 'active') { const { error: reactivateError } = await client.from(TABLES.teamMembers).update({ status: 'active', left_at: null, leave_reason: null, removed_by_member_id: null }).eq('id', existing.id); throwIfError(reactivateError); reactivated = true }
  const rollbackMembership = async () => { if (inserted) await client.from(TABLES.teamMembers).delete().eq('team_id', team.id).eq('member_id', application.applicant_id); else if (reactivated) await client.from(TABLES.teamMembers).update({ status: existing.status, left_at: existing.left_at, leave_reason: existing.leave_reason, removed_by_member_id: existing.removed_by_member_id }).eq('id', existing.id) }
  let countQuery = client.from(TABLES.teamMembers).select('*', { count: 'exact', head: true }).eq('team_id', team.id); if (capabilities.membershipStatus) countQuery = countQuery.eq('status', 'active')
  const { count, error: countError } = await countQuery; if (countError) { await rollbackMembership(); throw countError }
  const teamPatch = { current_members: Number(count ?? 0) + (leaderMembershipCount ? 0 : 1) }; if (teamPatch.current_members >= Number(team.required_members)) { teamPatch.status = 'closed'; teamPatch.closed_at = new Date().toISOString() }
  const { error: updateTeamError } = await client.from(TABLES.teams).update(teamPatch).eq('id', team.id); if (updateTeamError) { await rollbackMembership(); throw updateTeamError }
  const { data: accepted, error: acceptError } = await client.from(TABLES.applications).update({ status: 'accepted' }).eq('id', applicationId).eq('status', 'pending').select('id').maybeSingle()
  if (acceptError || !accepted) { await rollbackMembership(); await client.from(TABLES.teams).update({ current_members: team.current_members, status: team.status, closed_at: team.closed_at }).eq('id', team.id); if (acceptError) throw acceptError; throw new Error('다른 사용자가 먼저 처리한 지원서입니다.') }
  await notifyApplicationResult(client, application, team, 'accepted')
}
export async function getMyApplications(memberId) {
  const client = requireSupabase(); const [{ data: applications, error }, { data: teams, error: teamError }, { data: contests, error: contestError }] = await Promise.all([client.from(TABLES.applications).select('*').eq('applicant_id', memberId).order('id', { ascending: false }), client.from(TABLES.teams).select(TEAM_PUBLIC_FIELDS), client.from(TABLES.contests).select('*')]); throwIfError(error || teamError || contestError)
  const teamsById = new Map((teams ?? []).map((x) => [x.id, x])); const contestsById = new Map((contests ?? []).map((x) => [x.id, x])); return (applications ?? []).map((x) => { const team = teamsById.get(x.team_id); return { ...x, team, contest: contestsById.get(team?.contest_id) } })
}

export async function getMyApplicationDashboard(memberId) {
  const client = requireSupabase()
  await ensureTeamsForAcceptedLeaderApplications(memberId)
  const [{ data: teams, error: teamError }, { data: contests, error: contestError }, teamApplications, leaderApplications] = await Promise.all([
    client.from(TABLES.teams).select(TEAM_PUBLIC_FIELDS),
    client.from(TABLES.contests).select('*'),
    getMyApplications(memberId),
    getMyLeaderApplications(memberId),
  ])
  throwIfError(teamError || contestError)
  const contestsById = new Map((contests ?? []).map((contest) => [Number(contest.id), contest]))
  const teamsByContestAndLeader = new Map((teams ?? []).map((team) => [`${Number(team.contest_id)}:${Number(team.leader_id)}`, team]))
  const enrichedLeaderApplications = (leaderApplications ?? []).map((application) => {
    const contestId = Number(application.contest_id)
    return {
      ...application,
      contest: contestsById.get(contestId),
      team: teamsByContestAndLeader.get(`${contestId}:${Number(application.member_id)}`),
    }
  })
  return {
    leaderApplications: enrichedLeaderApplications,
    teamApplications,
  }
}

export async function deleteMyApplication(applicationId, memberId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from(TABLES.applications)
    .delete()
    .eq('id', applicationId)
    .eq('applicant_id', memberId)
    .select('id')
  throwIfError(error)
  if (!data || !data.length) throw new Error('삭제되지 않았습니다. 권한(prototype-write-access.sql)을 확인해 주세요.')
  return true
}

async function notifyApplicationResult(client, application, team, decision, rejectReason = '') {
  const { data: contest } = await client.from(TABLES.contests).select('title').eq('id', team.contest_id).maybeSingle()
  await client.from(TABLES.notifications).insert({
    member_id: application.applicant_id,
    type: 'application_result',
    title: decision === 'accepted' ? '팀 지원이 승인되었습니다.' : '팀 지원 결과를 확인해 주세요.',
    body: decision === 'accepted'
      ? `${contest?.title || '공모전'} 팀에 합류했습니다. 내 팀에서 상세 내용을 확인하세요.`
      : (rejectReason || `${contest?.title || '공모전'} 팀 지원이 승인되지 않았습니다.`),
    href: decision === 'accepted' ? '/my/teams' : '/my/applications',
  })
}
