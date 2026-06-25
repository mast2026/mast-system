import { Link, useSearchParams } from 'react-router-dom'
import ActivityWeatherIcon from '../components/ActivityWeatherIcon'
import { ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getMemberActivityWeather } from '../services/activityWeatherService'
import { ACTIVITY_WEATHER_POINTS, ACTIVITY_WEATHER_PRESETS, gradeFor } from '../utils/activityWeather'

const BREAKDOWN_META = {
  promotion:  { label: '에타 홍보 미션',       desc: '홍보 미션 완료 이력',     baseWeight: 40 },
  offline:    { label: 'OT·오프라인 참여',   desc: 'OT와 오프라인 참석 이력',  baseWeight: 30 },
  peerReview: { label: '공모전 참여·협업', desc: '완주와 팀원 협업 경험',  baseWeight: 30 },
}

function ScoreBar({ score, color = 'blue' }) {
  const pct = score !== null ? Math.min(100, Math.round(score)) : 0
  return (
    <div className="score-track">
      <i style={{ width: `${pct}%`, background: color === 'yellow' ? 'linear-gradient(90deg,#ffd75b,#ffb94d)' : undefined }} />
    </div>
  )
}

export default function ActivityWeatherScreen() {
  const { member } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = useQuery(() => getMemberActivityWeather(member), [member.id])
  const previewType = searchParams.get('preview')
  const rawPreviewScore = searchParams.get('previewScore')
  const previewScore = rawPreviewScore === null ? null : Number(rawPreviewScore)
  const previewName = searchParams.get('previewName') || ''
  const previewPreset = previewScore !== null && Number.isFinite(previewScore)
    ? makePreviewPreset(previewScore)
    : ACTIVITY_WEATHER_PRESETS.find((preset) => preset.weatherType === previewType || preset.grade === previewType)
  const displayName = previewName || member.name

  if (!previewPreset && q.loading) return <LoadingState label="활동날씨를 불러오는 중" />
  if (!previewPreset && q.error) return <ErrorState error={q.error} retry={q.retry} />

  const d = previewPreset ? makePreviewWeather(previewPreset) : q.data
  const { score, grade, weatherType, isCollectingData, message, breakdown } = d
  const weatherTitle = isCollectingData ? '날씨 확인 중' : grade
  const personalMessage = isCollectingData ? '기록을 모으고 있어요.' : `${displayName}님의 날씨는 ${message}`

  return <>
    {previewPreset && <DeveloperWeatherPreview selected={previewPreset} />}

    <section className={`weather-hero weather-bg-${weatherType}`}>
      <div>
        <span>{displayName}님의 활동날씨</span>
        {!isCollectingData && <b>{score}<small>/100</small></b>}
        <h1>{weatherTitle}</h1>
        <p>{personalMessage}</p>
      </div>
      <ActivityWeatherIcon weather={d} size="hero" />
    </section>

    <section className="weather-guide">
      <h2>MAST 활동날씨 제도 안내</h2>
      <p>활동날씨는 평가가 아니라 팀 매칭과 협업을 돕는 참고 지표입니다.</p>
      <div>
        <span>반영 항목</span>
        <b>OT 참여율 · 오프라인 참여율 · 에타 홍보 미션율 · 공모전 참여/완주율 · 협업 평가</b>
      </div>
      <div>
        <span>활용 범위</span>
        <b>팀 매칭 · 추천서 · 활동증명서 · 수료증 · 우수활동자 · 임원진 선발 참고</b>
      </div>
    </section>

    <section className="weather-breakdown">
      <div className="section-heading">
        <h2>날씨에 반영된 항목</h2>
        <span>홍보 40점 · 오프라인 30점 · 동료평가 30점</span>
      </div>
      {Object.entries(BREAKDOWN_META).map(([key, meta]) => {
        const item = breakdown[key]
        return (
          <article key={key}>
            <div>
              <b>{meta.label}</b>
              <small>
                {key === 'offline' && item.assumedDefault
                  ? 'OT 전 기본 점수 반영'
                  : key === 'peerReview' && !item.used
                    ? '공모전 종료 후 반영'
                    : item.used
                      ? `${meta.desc} · 최대 ${meta.baseWeight}점`
                      : '홍보 미션 데이터 확인 중'}
              </small>
            </div>
            <ScoreBar score={item.score} color={key === 'offline' ? 'yellow' : 'blue'} />
            <strong>
              {Math.round(item.points ?? 0)}<small>/{item.maxPoints}</small>
            </strong>
          </article>
        )
      })}
    </section>

    {isCollectingData && (
      <div className="weather-tip">
        <b>아직 날씨를 살펴보는 중이에요</b>
        <p>홍보, 오프라인 참여, 공모전 협업 경험이 쌓이면 활동날씨가 더 정확해집니다.</p>
      </div>
    )}

    {!isCollectingData && (
      <div className="weather-tip">
        <b>운영 목적</b>
        <p>활동날씨는 평가나 서열화가 아니라, 원활한 팀 매칭과 협업을 돕기 위한 참고 정보입니다.</p>
      </div>
    )}
  </>
}

function makePreviewPreset(score) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)))
  const gradeInfo = gradeFor(clampedScore)
  return {
    score: clampedScore,
    grade: gradeInfo.grade,
    weatherType: gradeInfo.weatherType,
    title: gradeInfo.grade,
    message: gradeInfo.message,
  }
}

function DeveloperWeatherPreview({ selected }) {
  return <section className="developer-weather-panel">
    <div>
      <b>개발자 프리뷰</b>
      <span>회원 화면 레이아웃 그대로 날씨 버전만 바꿔 확인합니다.</span>
    </div>
    <div className="developer-weather-buttons">
      {ACTIVITY_WEATHER_PRESETS.map((preset) => <Link
        key={preset.weatherType}
        className={selected.weatherType === preset.weatherType ? 'active' : ''}
        to={`/activity-weather?preview=${preset.weatherType}`}
      >
        {preset.grade}
      </Link>)}
      <Link to="/activity-weather">실제 데이터</Link>
    </div>
  </section>
}

function makePreviewWeather(preset) {
  const score = preset.score
  const basePoints = Math.min(70, score)
  const promotionPoints = Math.min(ACTIVITY_WEATHER_POINTS.promotion, basePoints * ACTIVITY_WEATHER_POINTS.promotion / 70)
  const offlinePoints = Math.min(ACTIVITY_WEATHER_POINTS.offline, basePoints * ACTIVITY_WEATHER_POINTS.offline / 70)
  const peerPoints = Math.max(0, Math.min(ACTIVITY_WEATHER_POINTS.peerReview, score - promotionPoints - offlinePoints))
  return {
    ...preset,
    isCollectingData: false,
    breakdown: {
      promotion: previewBreakdown(promotionPoints, ACTIVITY_WEATHER_POINTS.promotion),
      offline: previewBreakdown(offlinePoints, ACTIVITY_WEATHER_POINTS.offline),
      peerReview: previewBreakdown(peerPoints, ACTIVITY_WEATHER_POINTS.peerReview),
    },
    points: { promotion: promotionPoints, offline: offlinePoints, peerReview: peerPoints },
  }
}

function previewBreakdown(points, maxPoints) {
  return {
    score: Math.round(points / maxPoints * 100),
    rawScore: Math.round(points / maxPoints * 100),
    points,
    maxPoints,
    used: true,
    assumedDefault: false,
  }
}
