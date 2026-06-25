import { TABLES, requireSupabase, throwIfError } from './baseService'

const CONTEST_MARKER = '[contest_id]'
const TEAM_DRAFT_MARKER = '[team_post_draft]'
let capabilityPromise

function detectLeaderApplicationCapabilities() {
  if (!capabilityPromise) {
    capabilityPromise = (async () => {
      const { error } = await requireSupabase().from(TABLES.leaderApplications).select('contest_id').limit(1)
      return { contestId: !error }
    })()
  }
  return capabilityPromise
}

export function parseLeaderApplicationContestId(application) {
  if (application?.contest_id !== undefined && application?.contest_id !== null) return Number(application.contest_id)
  const match = String(application?.message || '').match(/\[contest_id\]\s*\n\s*(\d+)/)
  return match ? Number(match[1]) : null
}

export function stripLeaderContestMarker(message) {
  return String(message || '')
    .replace(/\[contest_id\]\s*\n\s*\d+\s*\n\n?/, '')
    .replace(/\[team_post_draft\]\s*\n[\s\S]*$/, '')
    .trim()
}

export function parseLeaderApplicationDraft(application) {
  const message = String(application?.message || '')
  const match = message.match(/\[team_post_draft\]\s*\n([\s\S]+)$/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function withContestMarker(contestId, message) {
  return `${CONTEST_MARKER}\n${Number(contestId)}\n\n${message || ''}`.trim()
}

function normalizeApplication(application) {
  if (!application) return null
  const contestId = parseLeaderApplicationContestId(application)
  return {
    ...application,
    contest_id: contestId,
    display_message: stripLeaderContestMarker(application.message),
    team_draft: parseLeaderApplicationDraft(application),
  }
}

async function getLeaderApplicationsForMember(memberId, status) {
  const query = requireSupabase().from(TABLES.leaderApplications).select('*').eq('member_id', memberId).order('id', { ascending: false })
  const { data, error } = status ? await query.eq('status', status) : await query
  throwIfError(error)
  return (data ?? []).map(normalizeApplication)
}

export async function getMyLeaderApplication(memberId, contestId) {
  const contestNumber = Number(contestId)
  if (!contestNumber) return null
  const capabilities = await detectLeaderApplicationCapabilities()
  let query = requireSupabase().from(TABLES.leaderApplications).select('*').eq('member_id', memberId).order('id', { ascending: false })
  if (capabilities.contestId) query = query.eq('contest_id', contestNumber)
  const { data, error } = await query
  throwIfError(error)
  const rows = (data ?? []).map(normalizeApplication)
  return (capabilities.contestId ? rows : rows.filter((row) => row.contest_id === contestNumber))[0] ?? null
}

export async function getAcceptedLeaderApplicationsForMember(memberId) {
  return getLeaderApplicationsForMember(memberId, 'accepted')
}

export async function getMyLeaderApplications(memberId) {
  return getLeaderApplicationsForMember(memberId)
}

export async function ensureTeamsForAcceptedLeaderApplications(memberId) {
  const client = requireSupabase()
  const applications = await getAcceptedLeaderApplicationsForMember(memberId)
  const results = []
  for (const application of applications) {
    try {
      const teamId = await createTeamFromLeaderApplication(client, application)
      results.push({ ...application, auto_post_team_id: teamId })
    } catch (error) {
      console.warn('승인된 팀장 신청 모집공고 자동 생성 실패:', error?.message || error)
      results.push({ ...application, auto_post_error: error?.message || '모집공고 자동 생성 실패' })
    }
  }
  return results
}

export async function canCreateTeamForContest(memberId, contestId) {
  const contestNumber = Number(contestId)
  if (!memberId || !contestNumber) return false
  const accepted = await getAcceptedLeaderApplicationsForMember(memberId)
  return accepted.some((application) => application.contest_id === contestNumber)
}

export async function applyForLeader(memberId, contestId, message) {
  const contestNumber = Number(contestId)
  if (!contestNumber) throw new Error('팀장으로 참여할 공모전을 선택해 주세요.')
  const existing = await getMyLeaderApplication(memberId, contestNumber)
  if (existing?.status === 'pending') throw new Error('이미 이 공모전의 팀장 신청이 검토 중입니다.')
  if (existing?.status === 'accepted') throw new Error('이미 이 공모전의 팀장 신청이 승인되었습니다.')

  const capabilities = await detectLeaderApplicationCapabilities()
  const payload = {
    member_id: memberId,
    status: 'pending',
    message: capabilities.contestId ? message : withContestMarker(contestNumber, message),
  }
  if (capabilities.contestId) payload.contest_id = contestNumber

  const { data, error } = await requireSupabase().from(TABLES.leaderApplications).insert(payload).select('*').single()
  throwIfError(error)
  return normalizeApplication(data)
}

export async function deleteMyLeaderApplication(applicationId, memberId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from(TABLES.leaderApplications)
    .delete()
    .eq('id', applicationId)
    .eq('member_id', memberId)
    .select('id')
  throwIfError(error)
  if (!data || !data.length) throw new Error('삭제되지 않았습니다. 권한(prototype-write-access.sql)을 확인해 주세요.')
  return true
}

export async function getPendingLeaderApplications() {
  const client = requireSupabase()
  const [{ data: applications, error }, { data: members, error: memberError }, { data: contests, error: contestError }] = await Promise.all([
    client.from(TABLES.leaderApplications).select('*').eq('status', 'pending').order('id', { ascending: true }),
    client.from(TABLES.members).select('*'),
    client.from(TABLES.contests).select('*'),
  ])
  throwIfError(error || memberError || contestError)
  const byMemberId = new Map((members ?? []).map((member) => [member.id, member]))
  const byContestId = new Map((contests ?? []).map((contest) => [contest.id, contest]))
  return (applications ?? []).map(normalizeApplication).map((application) => ({
    ...application,
    member: byMemberId.get(application.member_id),
    contest: byContestId.get(application.contest_id),
  }))
}

export async function decideLeaderApplication(applicationId, status) {
  if (!['accepted', 'rejected'].includes(status)) throw new Error('지원하지 않는 처리 상태입니다.')
  const client = requireSupabase()
  const { data: application, error: readError } = await client.from(TABLES.leaderApplications).select('*').eq('id', applicationId).eq('status', 'pending').maybeSingle()
  throwIfError(readError)
  if (!application) throw new Error('이미 처리되었거나 존재하지 않는 신청입니다.')
  const normalized = normalizeApplication(application)
  let createdTeamId = null
  if (status === 'accepted') {
    createdTeamId = await createTeamFromLeaderApplication(client, normalized)
  }
  const { data: changed, error } = await client.from(TABLES.leaderApplications).update({ status }).eq('id', applicationId).eq('status', 'pending').select('id').maybeSingle()
  if ((error || !changed) && createdTeamId) await rollbackCreatedTeam(client, createdTeamId)
  throwIfError(error)
  if (!changed) throw new Error('다른 운영진이 먼저 처리한 신청입니다.')
  if (status === 'accepted') {
    const { error: memberError } = await client.from(TABLES.members).update({ is_leader: true }).eq('id', application.member_id)
    // 최종 권한은 공모전별 accepted 신청건으로 판단합니다.
    // 일부 Supabase RLS에서 members 업데이트가 막혀도 신청 승인 자체는 완료되도록 둡니다.
    if (memberError) console.warn('team_matching_members.is_leader 업데이트 실패:', memberError.message)
  }

  let contestTitle = '선택한 공모전'
  if (normalized.contest_id) {
    const { data: contest } = await client.from(TABLES.contests).select('title').eq('id', normalized.contest_id).maybeSingle()
    if (contest?.title) contestTitle = contest.title
  }
  await client.from(TABLES.notifications).insert({
    member_id: application.member_id,
    type: 'leader_application_result',
    title: status === 'accepted' ? '공모전 팀장 신청이 승인되었습니다.' : '공모전 팀장 신청 결과를 확인해 주세요.',
    body: status === 'accepted'
      ? `${contestTitle} 모집공고가 자동으로 등록되었습니다. 내 팀에서 확인하세요.`
      : `${contestTitle} 팀장 신청이 승인되지 않았습니다. 내용을 보완해 다시 신청할 수 있습니다.`,
    href: status === 'accepted' && normalized.contest_id
      ? '/my/teams'
      : normalized.contest_id
        ? `/leader-application?contest=${normalized.contest_id}`
        : '/leader-application',
  })
}

async function createTeamFromLeaderApplication(client, application) {
  if (!application?.contest_id) throw new Error('공모전 정보가 없는 신청입니다.')
  const [{ data: existing, error: existingError }, { data: contest, error: contestError }] = await Promise.all([
    client.from(TABLES.teams).select('id').eq('contest_id', application.contest_id).eq('leader_id', application.member_id).maybeSingle(),
    client.from(TABLES.contests).select('*').eq('id', application.contest_id).maybeSingle(),
  ])
  throwIfError(existingError || contestError)
  if (existing?.id) return null

  const draft = application.team_draft || {}
  const environmentTags = Array.isArray(draft.environmentTags) ? draft.environmentTags : []
  const workStyle = environmentTags.includes('온라인만 참여')
    ? '온라인 중심'
    : environmentTags.includes('대면미팅 선호')
      ? '오프라인 중심'
      : '협의 후 결정'
  const skillTags = safeArray(draft.skillTags)
  const personalityTags = safeArray(draft.personalityTags)
  const participationTags = safeArray(draft.participationTags)
  const experienceTags = safeArray(draft.experienceTags)
  const intro = String(draft.capabilityAppeal || application.display_message || '팀장 신청 승인으로 생성된 모집공고입니다.').trim()

  const payload = {
    contest_id: Number(application.contest_id),
    leader_id: Number(application.member_id),
    required_members: Math.max(2, Number(contest?.max_team_size || 5)),
    current_members: 1,
    introduction: intro,
    prize_distribution: '팀 확정 후 협의',
    needed_roles: skillTags,
    work_style: workStyle,
    meeting_style: '팀 확정 후 협의',
    interest_areas: [...participationTags, ...experienceTags, ...environmentTags],
    personality_tags: personalityTags,
    skill_tags: skillTags,
    status: 'recruiting',
  }
  const { data: team, error: teamError } = await client.from(TABLES.teams).insert(payload).select('id').single()
  throwIfError(teamError)
  const membership = { team_id: team.id, member_id: Number(application.member_id) }
  const { error: statusProbeError } = await client.from(TABLES.teamMembers).select('status').limit(1)
  if (!statusProbeError) membership.status = 'active'
  const { error: memberError } = await client.from(TABLES.teamMembers).insert(membership)
  if (memberError) {
    await rollbackCreatedTeam(client, team.id)
    throw memberError
  }
  return team.id
}

async function rollbackCreatedTeam(client, teamId) {
  if (!teamId) return
  await client.from(TABLES.teamMembers).delete().eq('team_id', teamId)
  await client.from(TABLES.teams).delete().eq('id', teamId)
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}
