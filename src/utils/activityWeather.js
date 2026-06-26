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
