// 활동날씨 배점: 기본 활동 70점(에타 홍보 40 + 오프라인 출석 30) + 공모전 동료평가 30점
export const ACTIVITY_WEATHER_POINTS = { promotion: 40, offline: 30, peerReview: 30 }
export const ACTIVITY_WEATHER_WEIGHTS = { promotion: 0.4, offline: 0.3, peerReview: 0.3 }
export const OFFLINE_TARGET_POINTS = 30
export const OFFLINE_EVENT_TYPES = [
  'ot_attendance', 'offline_attendance', 'regular_session', 'offline_event', 'operation_support',
]

export const ACTIVITY_WEATHER_PRESETS = [
  { score: 98, grade: '무지개', weatherType: 'rainbow', title: '무지개', message: '최고예요.' },
  { score: 92, grade: '화창', weatherType: 'sunny', title: '화창', message: '매우 좋아요.' },
  { score: 84, grade: '구름낀 해', weatherType: 'partly_sunny', title: '구름낀 해', message: '좋아요.' },
  { score: 74, grade: '흐림', weatherType: 'cloudy_bright', title: '흐림', message: '안정적이에요.' },
  { score: 64, grade: '먹구름', weatherType: 'cloudy', title: '먹구름', message: '조금 흐려요.' },
  { score: 45, grade: '비', weatherType: 'rainy', title: '비', message: '회복 중이에요.' },
]

// 등급 및 날씨 타입 계산
export function gradeFor(score) {
  if (score === null || score === undefined) {
    return { grade: '확인 중', weatherType: 'collecting', message: '기록을 모으고 있어요.' }
  }
  if (score >= 95) return { grade: '무지개', weatherType: 'rainbow', message: '최고예요.' }
  if (score >= 90) return { grade: '화창', weatherType: 'sunny', message: '매우 좋아요.' }
  if (score >= 80) return { grade: '구름낀 해', weatherType: 'partly_sunny', message: '좋아요.' }
  if (score >= 70) return { grade: '흐림', weatherType: 'cloudy_bright', message: '안정적이에요.' }
  if (score >= 60) return { grade: '먹구름', weatherType: 'cloudy', message: '조금 흐려요.' }
  return { grade: '비', weatherType: 'rainy', message: '회복 중이에요.' }
}

/**
 * 활동날씨 최종 계산
 * @param {{ promotionScore: number|null, offlineScore: number|null, peerReviewScore: number|null }} scores
 */
export function calculateActivityWeather({ promotionScore = null, offlineScore = null, peerReviewScore = null } = {}) {
  const raw = { promotion: promotionScore, offline: offlineScore, peerReview: peerReviewScore }
  const used = Object.fromEntries(Object.keys(raw).map((key) => [key, raw[key] !== null && raw[key] !== undefined && raw[key] !== '' && Number.isFinite(Number(raw[key]))]))
  const normalized = {
    promotion: used.promotion ? clampPercent(raw.promotion) : null,
    // 기본 점수 없이 실제 출석률로만 반영합니다. (오프라인 25 + 온라인 5 = 30점, 출석 데이터가 없으면 0점)
    offline: used.offline ? clampPercent(raw.offline) : 0,
    peerReview: used.peerReview ? clampPercent(raw.peerReview) : null,
  }
  const points = {
    promotion: used.promotion ? normalized.promotion / 100 * ACTIVITY_WEATHER_POINTS.promotion : 0,
    offline: normalized.offline / 100 * ACTIVITY_WEATHER_POINTS.offline,
    peerReview: used.peerReview ? normalized.peerReview / 100 * ACTIVITY_WEATHER_POINTS.peerReview : 0,
  }
  // 최종 점수는 고정 배점 합산입니다. 홍보 만점 + 기본 출석이면 70점부터 시작합니다.
  const score = Math.round(points.promotion + points.offline + points.peerReview)
  const gradeInfo = gradeFor(score)

  return {
    score, ...gradeInfo, isCollectingData: false,
    breakdown: {
      promotion: { score: normalized.promotion, rawScore: raw.promotion, points: points.promotion, maxPoints: ACTIVITY_WEATHER_POINTS.promotion, weight: ACTIVITY_WEATHER_WEIGHTS.promotion, used: used.promotion, assumedDefault: false },
      offline: { score: normalized.offline, rawScore: raw.offline, points: points.offline, maxPoints: ACTIVITY_WEATHER_POINTS.offline, weight: ACTIVITY_WEATHER_WEIGHTS.offline, used: true, assumedDefault: !used.offline },
      peerReview: { score: normalized.peerReview, rawScore: raw.peerReview, points: points.peerReview, maxPoints: ACTIVITY_WEATHER_POINTS.peerReview, weight: ACTIVITY_WEATHER_WEIGHTS.peerReview, used: used.peerReview, assumedDefault: false, pending: !used.peerReview },
    },
    effectiveWeights: ACTIVITY_WEATHER_WEIGHTS,
    points,
  }
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, Number(value)))
}

// 레거시 호환
export function weatherFor(score) {
  const { grade, weatherType, message } = gradeFor(score)
  return { key: weatherType, label: grade, message }
}

/* ===========================================================================
 * 루브릭 기반 점수 모델 (2026-06-26 개편)
 * 모든 회원은 70점에서 시작하고, 관리자가 입력한 가감점 이벤트를 합산합니다.
 * 최종 점수는 0~100으로 제한합니다.
 * ========================================================================= */
export const WEATHER_BASE_SCORE = 70

// 관리자 화면에서 버튼으로 노출되는 가감점 프리셋.
// key는 score_events.event_type 로 저장되고, points 는 부호 포함 점수입니다.
// 수동 버튼으로만 부여하는 항목.
// (오티 정참/지각/결석 → 출석 기록 자동, 공모전 참여 → 팀 합류 승인 자동,
//  동료평가 1위 → 결과 반영 자동, 에타 미참여 → 미션 마감 후 자동 — 이들은 버튼에서 제외)
export const SCORE_RUBRIC = [
  // 가산
  { key: 'ot_jacket',          label: '오티 과잠바 착용',           points: 2,   group: 'gain' },
  { key: 'contest_submit',     label: '공모전 제출/미팅/피드백 참여', points: 5,   group: 'gain' },
  { key: 'contest_award',      label: '공모전 수상',               points: 20,  group: 'gain' },
  // 감점
  { key: 'ot_no_jacket',       label: '오티 과잠바 미착용',         points: -2,  group: 'deduct' },
  { key: 'contest_out',        label: '공모전 정정기간 외 아웃',     points: -10, group: 'deduct' },
  { key: 'contest_no_submit',  label: '공모전 제출/미팅/피드백 미참여', points: -5, group: 'deduct' },
]

const RUBRIC_BY_KEY = Object.fromEntries(SCORE_RUBRIC.map((item) => [item.key, item]))

// score_events 한 건의 라벨/점수를 정규화합니다.
export function normalizeScoreEvent(event) {
  const points = Number(event?.points ?? event?.score_delta ?? 0) || 0
  const key = event?.event_type ?? ''
  const reason = event?.metadata?.reason ?? event?.reason ?? ''
  const label = reason || RUBRIC_BY_KEY[key]?.label || key || '점수 조정'
  const auto = Boolean(event?.metadata?.auto || event?.auto || event?.derived)
  return { id: event?.id, key, points, label, createdAt: event?.created_at ?? null, auto }
}

/**
 * 이벤트 합산으로 활동날씨를 계산합니다. (70점 시작, 0~100 제한)
 * @param {Array} events - team_matching_member_score_events 행 배열
 */
export function calculateWeatherFromEvents(events = [], { base = WEATHER_BASE_SCORE } = {}) {
  const items = (events ?? []).map(normalizeScoreEvent)
  const totalDelta = items.reduce((sum, item) => sum + item.points, 0)
  const score = clampPercent(Math.round(base + totalDelta))
  const gradeInfo = gradeFor(score)
  return {
    score,
    ...gradeInfo,
    isCollectingData: false,
    base,
    totalDelta,
    events: items,
  }
}
