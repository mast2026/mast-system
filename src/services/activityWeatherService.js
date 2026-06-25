import { requireSupabase, TABLES } from './baseService'
import { ACTIVITY_WEATHER_PRESETS, calculateActivityWeather, OFFLINE_EVENT_TYPES, OFFLINE_TARGET_POINTS } from '../utils/activityWeather'
export { calculateActivityWeather, gradeFor, weatherFor } from '../utils/activityWeather'

// 지도교수·고문은 활동날씨 산정 대상이 아닙니다.
const WEATHER_EXEMPT_TITLES = ['지도교수', '고문']
export function isWeatherExempt(member) {
  return WEATHER_EXEMPT_TITLES.includes(String(member?.position_title || '').trim())
}
function weatherExemptResult() {
  const empty = (maxPoints) => ({ score: null, rawScore: null, points: 0, maxPoints, used: false, assumedDefault: false })
  return {
    exempt: true, score: null, grade: '미적용', weatherType: 'collecting',
    message: '지도교수·고문은 활동날씨 대상이 아니에요.', isCollectingData: false,
    breakdown: { promotion: empty(40), offline: empty(30), peerReview: empty(30) },
  }
}

function testWeatherResultForMember(member) {
  const name = String(member?.name || '')
  if (!name.includes('[테스트]')) return null
  const preset = ACTIVITY_WEATHER_PRESETS.find((item) => name.includes(item.grade) || name.includes(item.weatherType))
  if (!preset) return null

  const score = Number(preset.score)
  const basePoints = Math.min(70, score)
  const promotionScore = basePoints / 70 * 100
  const offlineScore = basePoints / 70 * 100
  const peerReviewScore = Math.max(0, score - basePoints) / 30 * 100

  return {
    ...calculateActivityWeather({ promotionScore, offlineScore, peerReviewScore }),
    grade: preset.grade,
    weatherType: preset.weatherType,
    message: preset.message,
    testWeather: true,
    raw: { testWeatherPreset: preset },
  }
}

// 에타 홍보 점수 계산 (promotion_member_progress_view)
function normalizePercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null
  const number = Number(value)
  return Math.min(100, Math.max(0, number <= 1 ? number * 100 : number))
}

function firstNumber(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) return Number(value)
  }
  return null
}

function calcPromotionScore(row) {
  if (!row) return null
  const directRate = firstNumber(row, [
    'completion_rate',
    'mission_completion_rate',
    'promotion_completion_rate',
    'progress_rate',
    'complete_rate',
    'completion_percent',
    'approved_rate',
    'verified_rate',
    'rate',
    'percentage',
  ])
  if (directRate !== null) return normalizePercent(directRate)

  const approved = firstNumber(row, [
    'approved_count',
    'verified_count',
    'certified_count',
    'confirmed_count',
    'success_count',
    'completed_count',
    'complete_count',
    'approved_mission_count',
    'verified_mission_count',
  ])
  const unapproved = firstNumber(row, [
    'unapproved_count',
    'unverified_count',
    'uncertified_count',
    'pending_count',
    'rejected_count',
    'failed_count',
    'not_approved_count',
  ])
  const target = firstNumber(row, [
    'target_count',
    'required_count',
    'total_count',
    'mission_count',
    'submitted_count',
    'submission_count',
    'all_count',
  ]) ?? (approved !== null && unapproved !== null ? approved + unapproved : null)

  if (approved !== null && target > 0) {
    return Math.min(100, (approved / target) * 100)
  }
  return null
}

// 오프라인 참여 점수 (activity_attendance_summary_view.attendance_rate 직접 사용)
function calcOfflineEventScore(events) {
  const verifiedEvents = (events ?? []).filter((event) => event.verified !== false && (!event.event_type || OFFLINE_EVENT_TYPES.includes(event.event_type) || event.event_type === 'offline'))
  if (!verifiedEvents.length) return null
  const points = verifiedEvents.reduce((sum, event) => sum + Number(event.score_delta ?? event.points ?? 0), 0)
  return normalizePercent(points / OFFLINE_TARGET_POINTS * 100)
}

function calcOfflineScore(row, events = []) {
  const attendanceScore = row?.attendance_rate === null || row?.attendance_rate === undefined ? null : normalizePercent(row.attendance_rate)
  const eventScore = calcOfflineEventScore(events)
  if (attendanceScore === null && eventScore === null) return null
  return Math.max(attendanceScore ?? 0, eventScore ?? 0)
}

// 동료평가 점수 계산 (team_matching_peer_reviews)
function calcPeerReviewScore(reviews) {
  const approvedReviews = (reviews ?? []).filter(isApprovedPeerReview)
  if (!approvedReviews.length) return null
  const sum = approvedReviews.reduce((acc, r) => {
    const scores = [
      Number(r.participation ?? r.participation_score),
      Number(r.sincerity ?? r.sincerity_score),
      Number(r.collaboration ?? r.collaboration_score),
      Number(r.communication ?? r.communication_score),
      Number(r.contribution ?? r.contribution_score ?? parseContributionFromComment(r.comment)),
    ].filter((score) => Number.isFinite(score) && score > 0)
    const avg = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : 0
    return acc + avg
  }, 0)
  return (sum / approvedReviews.length / 5) * 100
}

function isApprovedPeerReview(review) {
  if (!review) return false
  if ('status' in review && review.status) return ['approved', 'accepted', 'verified'].includes(String(review.status))
  if ('approved' in review) return review.approved === true
  if ('is_approved' in review) return review.is_approved === true
  return true
}

function parseContributionFromComment(comment) {
  const match = String(comment || '').match(/\[기여도:(\d+)\]/)
  return match ? Number(match[1]) : null
}

/**
 * 특정 회원의 활동날씨 데이터 조회 및 계산
 * @param {{ id: number, mast_member_id: string }} member
 */
export async function getMemberActivityWeather(member) {
  const testWeather = testWeatherResultForMember(member)
  if (testWeather) return testWeather
  if (isWeatherExempt(member)) return { ...weatherExemptResult(), raw: {} }
  const supabase = requireSupabase()
  const memberId = member?.id ?? member  // 하위 호환

  const [promotionRes, attendanceRes, peerRes, peerSummaryRes, eventRes] = await Promise.all([
    // 에타 홍보: promotion_member_progress_view의 member_id가 UUID일 수도, 정수 id 참조일 수도 있어 후보를 넓게 매칭합니다.
    supabase.from(TABLES.progressView).select('*'),

    // mast_member_id가 비어 있는 기존 회원도 홍보 View의 UUID로 연결할 수 있도록 전체 요약을 읽습니다.
    supabase.from(TABLES.attendanceSummary).select('*'),

    // 동료평가: reviewee_id = team_matching_members.id (integer)
    supabase.from(TABLES.peerReviews).select('*').eq('reviewee_id', memberId),
    safeSelectPeerReviewSummary(),
    supabase.from(TABLES.scoreEvents).select('*').eq('member_id', memberId).eq('verified', true),
  ])

  const promotionRow = findPromotionRow(promotionRes.data ?? [], member)
  const attendanceRow = findAttendanceRow(attendanceRes.data ?? [], member, promotionRow)
  const promotionScore = calcPromotionScore(promotionRow)
  const offlineScore = calcOfflineScore(attendanceRow, eventRes.data)
  const peerSummaryRow = findPeerSummaryRow(peerSummaryRes.data ?? [], memberId)
  const peerReviewScore = normalizePercent(peerSummaryRow?.peer_review_score ?? peerSummaryRow?.average_score ?? peerSummaryRow?.score) ?? calcPeerReviewScore(peerRes.data)

  return {
    ...calculateActivityWeather({ promotionScore, offlineScore, peerReviewScore }),
    raw: {
      promotionData: promotionRow,
      attendanceSummary: attendanceRow,
      peerReviewSummary: peerSummaryRow,
      peerReviews: peerRes.data ?? [],
      scoreEvents: eventRes.data ?? [],
    },
  }
}

/**
 * 전체 회원 활동날씨 일괄 계산 (관리자용)
 * @param {Array<{ id: number, mast_member_id: string }>} members
 */
export async function getAllActivityWeather(members) {
  const supabase = requireSupabase()

  const [promoRes, attendanceRes, peerRes, peerSummaryRes, eventRes] = await Promise.all([
    supabase.from(TABLES.progressView).select('*'),
    supabase.from(TABLES.attendanceSummary).select('*'),
    supabase.from(TABLES.peerReviews).select('*'),
    safeSelectPeerReviewSummary(),
    supabase.from(TABLES.scoreEvents).select('*').eq('verified', true),
  ])

  const allPromo = promoRes.data ?? []
  const allAttendance = attendanceRes.data ?? []
  const allPeer = peerRes.data ?? []
  const allPeerSummary = peerSummaryRes.data ?? []
  const allEvents = eventRes.data ?? []

  return members.map((member) => {
    const testWeather = testWeatherResultForMember(member)
    if (testWeather) return { ...member, activityWeather: testWeather, testWeather: true, raw: testWeather.raw }
    if (isWeatherExempt(member)) {
      return { ...member, activityWeather: weatherExemptResult(), weatherExempt: true, raw: {} }
    }
    const promoRow = findPromotionRow(allPromo, member)
    // attendance_summary: member_id = mast_member_id (uuid)
    const attendanceRow = findAttendanceRow(allAttendance, member, promoRow)
    const peerReviews = allPeer.filter((r) => Number(r.reviewee_id) === Number(member.id))
    const peerSummaryRow = findPeerSummaryRow(allPeerSummary, member.id)
    const scoreEvents = allEvents.filter((event) => Number(event.member_id) === Number(member.id))

    return {
      ...member,
      activityWeather: calculateActivityWeather({
        promotionScore: calcPromotionScore(promoRow),
        offlineScore: calcOfflineScore(attendanceRow, scoreEvents),
        peerReviewScore: normalizePercent(peerSummaryRow?.peer_review_score ?? peerSummaryRow?.average_score ?? peerSummaryRow?.score) ?? calcPeerReviewScore(peerReviews),
      }),
      raw: {
        promotionData: promoRow,
        attendanceSummary: attendanceRow,
        peerReviewSummary: peerSummaryRow,
        peerReviews,
        scoreEvents,
      },
    }
  })
}

async function safeSelectPeerReviewSummary() {
  try {
    const result = await requireSupabase().from(TABLES.peerReviewSummary).select('*')
    if (result.error) return { data: [], error: null }
    return result
  } catch {
    return { data: [], error: null }
  }
}

function findPeerSummaryRow(rows = [], memberId) {
  return (rows ?? []).find((row) => Number(row.member_id ?? row.reviewee_id) === Number(memberId)) ?? null
}

function findPromotionRow(rows = [], member) {
  const memberId = member?.id ?? member
  const mastMemberId = member?.mast_member_id
  const candidates = [
    mastMemberId,
    memberId,
    member?.member_id,
    member?.user_id,
    member?.profile_id,
  ].filter((value) => value !== null && value !== undefined && value !== '').map(String)

  const idMatch = (rows ?? []).find((row) => {
    const rowCandidates = [
      row.member_id,
      row.mast_member_id,
      row.team_matching_member_id,
      row.member_integer_id,
      row.tm_member_id,
      row.user_id,
      row.profile_id,
    ].filter((value) => value !== null && value !== undefined && value !== '').map(String)
    return rowCandidates.some((value) => candidates.includes(value))
  })
  if (idMatch) return idMatch

  // 기존 회원 데이터에 mast_member_id가 비어 있는 경우에만 이름+학교로 보조 매칭합니다.
  // 동명이인 오연결을 막기 위해 두 값이 모두 일치해야 합니다.
  if (!mastMemberId && member?.name && member?.school) {
    return (rows ?? []).find((row) =>
      row.member_name === member.name && row.school === member.school
    ) ?? null
  }
  return null
}

function findAttendanceRow(rows = [], member, promotionRow) {
  const externalMemberId = member?.mast_member_id ?? promotionRow?.member_id
  if (!externalMemberId) return null
  return (rows ?? []).find((row) => String(row.member_id) === String(externalMemberId)) ?? null
}
