import { Link, useSearchParams } from 'react-router-dom'
import ActivityWeatherIcon from '../components/ActivityWeatherIcon'
import { ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getMemberActivityWeather } from '../services/activityWeatherService'
import { ACTIVITY_WEATHER_PRESETS, WEATHER_BASE_SCORE, gradeFor } from '../utils/activityWeather'

export default function ActivityWeatherScreen() {
  const { member } = useAuth()
  const [searchParams] = useSearchParams()
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
  const { score, grade, weatherType, isCollectingData, message, exempt } = d
  const base = d.base ?? WEATHER_BASE_SCORE
  const events = d.events ?? []
  const totalDelta = d.totalDelta ?? 0
  const weatherTitle = exempt ? '미적용' : isCollectingData ? '날씨 확인 중' : grade
  const personalMessage = exempt
    ? '지도교수·고문은 활동날씨 대상이 아니에요.'
    : isCollectingData ? '기록을 모으고 있어요.' : `${displayName}님의 날씨는 ${message}`

  return <>
    {previewPreset && <DeveloperWeatherPreview selected={previewPreset} />}

    <section className={`weather-hero weather-bg-${weatherType}`}>
      <div>
        <span>{displayName}님의 활동날씨</span>
        {!isCollectingData && !exempt && <b>{score}<small>/100</small></b>}
        <h1>{weatherTitle}</h1>
        <p>{personalMessage}</p>
      </div>
      <ActivityWeatherIcon weather={d} size="hero" />
    </section>

    <section className="weather-guide">
      <h2>MAST 활동날씨 제도 안내</h2>
      <p>활동날씨는 평가가 아니라 팀 매칭과 협업을 돕는 참고 지표입니다.</p>
      <div>
        <span>점수 방식</span>
        <b>{base}점에서 시작해 활동에 따라 가산·감점됩니다 (0~100점)</b>
      </div>
      <div>
        <span>반영 항목</span>
        <b>오티 참여 · 에타 홍보 · 공모전 참여/제출/수상 · 동료 평가</b>
      </div>
      <div>
        <span>활용 범위</span>
        <b>팀 매칭 · 추천서 · 활동증명서 · 수료증 · 우수활동자 · 임원진 선발 참고</b>
      </div>
    </section>

    {!exempt && <section className="weather-breakdown">
      <div className="section-heading">
        <h2>점수 내역</h2>
        <span>{base}점 시작 · 가감점 {totalDelta >= 0 ? '+' : ''}{totalDelta}</span>
      </div>

      <div className="score-ledger">
        <div className="score-ledger-row base">
          <b>시작 점수</b>
          <em>{base}</em>
        </div>
        {events.map((ev, i) => (
          <div className="score-ledger-row" key={ev.id ?? i}>
            <b>{ev.label}</b>
            <em className={ev.points >= 0 ? 'up' : 'down'}>{ev.points >= 0 ? '+' : ''}{ev.points}</em>
          </div>
        ))}
        {!events.length && <div className="score-ledger-empty">아직 반영된 가감점이 없어요. 활동을 시작하면 여기에 쌓입니다.</div>}
        <div className="score-ledger-row total">
          <b>현재 점수</b>
          <em>{score}<small>/100</small></em>
        </div>
      </div>
    </section>}

    {!exempt && <div className="weather-tip">
      <b>운영 목적</b>
      <p>활동날씨는 평가나 서열화가 아니라, 원활한 팀 매칭과 협업을 돕기 위한 참고 정보입니다.</p>
    </div>}
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
  return {
    ...preset,
    isCollectingData: false,
    base: WEATHER_BASE_SCORE,
    totalDelta: score - WEATHER_BASE_SCORE,
    events: [{ id: 'preview', label: '프리뷰 가감점', points: score - WEATHER_BASE_SCORE }],
  }
}
