import { RESULT_LABELS, resultLabel } from '../constants/results'
import { requireSupabase, TABLES, throwIfError } from './baseService'

let peerReviewCapabilityPromise

export function canOperateResult(member, team) {
  const role = member?.role
  return Number(team?.leader_id) === Number(member?.id) || ['admin', 'manager', 'professor'].includes(role)
}

function isMissingColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return /column|schema cache|award_result|peer_review_open|peer_review_deadline/i.test(message)
}

function isStatusConstraintError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return /status|check constraint|violates check/i.test(message)
}

function assertResultPermission(member, team) {
  if (!team) throw new Error('팀을 찾을 수 없습니다.')
  if (!canOperateResult(member, team)) throw new Error('이 팀의 결과를 등록할 권한이 없습니다.')
}

function normalizeRating(value, label) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 5) throw new Error(`${label}은 1점부터 5점까지 선택해 주세요.`)
  return number
}

function detectPeerReviewCapabilities() {
  if (!peerReviewCapabilityPromise) {
    peerReviewCapabilityPromise = (async () => {
      const { error } = await requireSupabase().from(TABLES.peerReviews).select('contribution').limit(1)
      return { contribution: !error }
    })()
  }
  return peerReviewCapabilityPromise
}

export async function getTeamResultContext(teamId, member) {
  const client = requireSupabase()
  const [
    { data: team, error: teamError },
    { data: contests, error: contestError },
    { data: members, error: memberError },
    { data: links, error: linkError },
    { data: awards, error: awardError },
  ] = await Promise.all([
    client.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle(),
    client.from(TABLES.contests).select('*'),
    client.from(TABLES.members).select('*'),
    client.from(TABLES.teamMembers).select('*').eq('team_id', teamId),
    client.from(TABLES.awards).select('*').eq('team_id', teamId).order('id', { ascending: false }),
  ])
  throwIfError(teamError || contestError || memberError || linkError || awardError)
  assertResultPermission(member, team)

  const contestsById = new Map((contests ?? []).map((contest) => [contest.id, contest]))
  const membersById = new Map((members ?? []).map((item) => [item.id, item]))
  const activeLinks = (links ?? []).filter((link) => !Object.prototype.hasOwnProperty.call(link, 'status') || ['active', 'completed'].includes(link.status))
  const teamMembers = [
    membersById.get(team.leader_id),
    ...activeLinks.map((link) => membersById.get(link.member_id)).filter(Boolean).filter((item) => Number(item.id) !== Number(team.leader_id)),
  ].filter(Boolean)

  return {
    team: {
      ...team,
      contest: contestsById.get(team.contest_id),
      leader: membersById.get(team.leader_id),
      teamMembers,
    },
    awards: awards ?? [],
  }
}

export async function registerTeamResult(teamId, member, values) {
  const client = requireSupabase()
  const { data: team, error: teamError } = await client.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle()
  throwIfError(teamError)
  assertResultPermission(member, team)

  const awardResult = values.award_result
  if (!RESULT_LABELS[awardResult]) throw new Error('결과 유형을 선택해 주세요.')
  if (team.status === 'recruiting') throw new Error('모집 중인 팀은 먼저 모집을 마감한 뒤 결과를 등록해 주세요.')

  const now = new Date().toISOString()
  const patch = {
    award_result: awardResult,
    status: 'finished',
    closed_at: team.closed_at || now,
    peer_review_open: Boolean(values.peer_review_open),
    peer_review_deadline: values.peer_review_deadline || null,
    updated_at: now,
  }

  const { data: updated, error: updateError } = await client
    .from(TABLES.teams)
    .update(patch)
    .eq('id', teamId)
    .select('*')
    .maybeSingle()

  if (updateError) {
    if (isMissingColumnError(updateError)) throw new Error('DB 컬럼 추가 필요: team_matching_teams에 award_result, peer_review_open, peer_review_deadline 컬럼이 필요합니다.')
    if (isStatusConstraintError(updateError)) throw new Error("DB 상태값 추가 필요: team_matching_teams.status에 'finished' 값을 허용해야 합니다.")
    throw updateError
  }
  if (!updated) throw new Error('팀 결과 저장에 실패했습니다.')

  const awardPayload = {
    team_id: Number(teamId),
    contest_id: Number(team.contest_id),
    award_result: resultLabel(awardResult),
  }
  const { error: awardError } = await client.from(TABLES.awards).insert(awardPayload)
  if (awardError) throw awardError
  return updated
}

export async function getPeerReviewContext(teamId, member) {
  const client = requireSupabase()
  const [
    { data: team, error: teamError },
    { data: links, error: linkError },
    { data: members, error: memberError },
    { data: existing, error: existingError },
  ] = await Promise.all([
    client.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle(),
    client.from(TABLES.teamMembers).select('*').eq('team_id', teamId),
    client.from(TABLES.members).select('*'),
    client.from(TABLES.peerReviews).select('*').eq('team_id', teamId).eq('reviewer_id', member.id),
  ])
  throwIfError(teamError || linkError || memberError || existingError)
  if (!team) throw new Error('팀을 찾을 수 없습니다.')

  const membersById = new Map((members ?? []).map((item) => [item.id, item]))
  const reviewableLinks = (links ?? []).filter((link) => !Object.prototype.hasOwnProperty.call(link, 'status') || ['active', 'completed'].includes(link.status))
  const reviewableMembers = [
    membersById.get(team.leader_id),
    ...reviewableLinks.map((link) => membersById.get(link.member_id)).filter(Boolean),
  ].filter(Boolean)
  const uniqueMembers = [...new Map(reviewableMembers.map((item) => [Number(item.id), item])).values()]
  const isParticipant = uniqueMembers.some((item) => Number(item.id) === Number(member.id))
  const deadline = team.peer_review_deadline ? new Date(team.peer_review_deadline) : null
  const reviewedIds = new Set((existing ?? []).map((review) => Number(review.reviewee_id)))
  const targets = uniqueMembers.filter((item) => Number(item.id) !== Number(member.id) && !reviewedIds.has(Number(item.id)))

  let blockedReason = ''
  if (team.status !== 'finished') blockedReason = '공모전 결과 등록 후 동료평가를 진행할 수 있습니다.'
  else if (!team.peer_review_open) blockedReason = '아직 동료평가가 열리지 않았습니다.'
  else if (deadline && deadline.getTime() < Date.now()) blockedReason = '동료평가 기간이 종료되었습니다.'
  else if (!isParticipant) blockedReason = '해당 팀의 팀원만 동료평가를 제출할 수 있습니다.'
  else if (!targets.length) blockedReason = '평가할 팀원이 더 이상 없습니다.'

  return { team, members: uniqueMembers, targets, existing: existing ?? [], blockedReason }
}

export async function submitPeerReview(teamId, member, values) {
  const context = await getPeerReviewContext(teamId, member)
  if (context.blockedReason) throw new Error(context.blockedReason)
  const revieweeId = Number(values.reviewee_id)
  if (!context.targets.some((target) => Number(target.id) === revieweeId)) throw new Error('평가할 수 없는 팀원입니다.')
  const capabilities = await detectPeerReviewCapabilities()
  const contribution = normalizeRating(values.contribution, '기여도')
  const plainComment = values.comment?.trim() || ''

  const payload = {
    team_id: Number(teamId),
    reviewer_id: Number(member.id),
    reviewee_id: revieweeId,
    participation: normalizeRating(values.participation, '참여도'),
    sincerity: normalizeRating(values.sincerity, '책임감'),
    collaboration: normalizeRating(values.collaboration, '협업 태도'),
    communication: normalizeRating(values.communication, '소통'),
    comment: capabilities.contribution ? (plainComment || null) : `[기여도:${contribution}]${plainComment ? `\n${plainComment}` : ''}`,
  }
  if (capabilities.contribution) payload.contribution = contribution
  const { error } = await requireSupabase().from(TABLES.peerReviews).insert(payload)
  if (error) throw error
}
