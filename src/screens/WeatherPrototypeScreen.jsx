import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, CloudSun, FileText, MessageSquareText, Trophy, UsersRound } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ActivityWeatherIcon from '../components/ActivityWeatherIcon'
import Badge from '../components/Badge'
import { ACTIVITY_WEATHER_PRESETS, gradeFor } from '../utils/activityWeather'

const flow = [
  ['공모전 확인', '진행 중인 공모전 카드에서 상세와 공식 링크를 확인', '/contests', Trophy],
  ['팀장 신청', '공모전별 팀 공고 작성 권한을 신청', '/leader-application', ClipboardCheck],
  ['팀 생성/지원', '승인된 팀장은 공고 작성, 팀원은 지원서 제출', '/teams', UsersRound],
  ['결과 등록', '공모전 종료 후 운영진이 수상 결과 등록', '/admin/awards', FileText],
  ['동료평가', '결과 등록 이후 팀원 간 협업 평가 진행', '/peer-review-preview', MessageSquareText],
  ['활동날씨 반영', '홍보 40 + 오프라인 30 + 동료평가 30으로 날씨 확인', '/activity-weather', CloudSun],
]

const demoWeatherMembers = [
  { name: '무지개 테스트', score: 98, note: '최고 구간' },
  { name: '화창 테스트', score: 92, note: '매우 좋음' },
  { name: '구름낀 해 테스트', score: 84, note: '좋음' },
  { name: '흐림 테스트', score: 74, note: '기본 70점대' },
  { name: '먹구름 테스트', score: 64, note: '주의 구간' },
  { name: '비 테스트', score: 45, note: '회복 필요' },
]

export default function WeatherPrototypeScreen() {
  const [selectedWeatherType, setSelectedWeatherType] = useState(ACTIVITY_WEATHER_PRESETS[0]?.weatherType)
  const selectedWeather = ACTIVITY_WEATHER_PRESETS.find((preset) => preset.weatherType === selectedWeatherType) ?? ACTIVITY_WEATHER_PRESETS[0]

  return <>
    <PageHeader title="프로토타입 확인" description="실제 DB 데이터와 무관한 사용자 흐름 테스트 화면입니다." />

    <section className="prototype-flow-panel">
      <div className="section-heading">
        <h2>사용자 흐름</h2>
        <span>회원 화면에는 노출하지 않는 확인용</span>
      </div>
      <div className="prototype-flow-grid">
        {flow.map(([title, text, to, Icon], index) => <Link key={title} to={to} className="prototype-step-card">
          <span className="prototype-step-number">{index + 1}</span>
          <Icon />
          <div>
            <b>{title}</b>
            <small>{text}</small>
          </div>
          <ArrowRight />
        </Link>)}
      </div>
    </section>

    <section className="prototype-mock-phone">
      <article className="prototype-contest-card">
        <div>
          <Badge value="open" />
          <h2>제14회 공공데이터 활용 공모전</h2>
          <p>공공데이터를 활용한 서비스 아이디어를 모집합니다.</p>
        </div>
        <dl>
          <div><dt>접수 마감</dt><dd>D-14</dd></div>
          <div><dt>결과 발표</dt><dd>7. 20.</dd></div>
          <div><dt>모집 팀</dt><dd>3개</dd></div>
        </dl>
      </article>
      <article className="prototype-team-card">
        <h3>현재 모집 중인 팀</h3>
        <div><UsersRound /><b>기획·PPT·발표 역할 모집</b><span>4 / 6명 모집 중</span></div>
        <button type="button">지원하기</button>
      </article>
    </section>

    <section className="prototype-flow-panel prototype-contest-check">
      <div className="section-heading">
        <h2>공모전 상태 확인</h2>
        <span>실제 DB 변경 없음</span>
      </div>
      <div className="prototype-check-actions">
        <Link className="button secondary" to="/contests/list">진행 중 공모전 화면</Link>
        <Link className="button primary" to="/contests/list?preview=closed">마감 공모전 화면</Link>
        <Link className="button secondary" to="/peer-review-preview">동료평가 작성 예시</Link>
      </div>
    </section>

    <section className="weather-preview prototype-only">
      <div className="section-heading">
        <h2>활동날씨 버전</h2>
        <span>버튼으로 하나씩 확인</span>
      </div>
      <div className="weather-version-tabs" role="tablist" aria-label="활동날씨 버전 선택">
        {ACTIVITY_WEATHER_PRESETS.map((preset) => <button
          key={preset.weatherType}
          type="button"
          className={preset.weatherType === selectedWeather.weatherType ? 'active' : ''}
          onClick={() => setSelectedWeatherType(preset.weatherType)}
        >
          {preset.grade}
        </button>)}
      </div>
      <article className={`weather-preview-card weather-preview-single weather-bg-${selectedWeather.weatherType}`}>
        <ActivityWeatherIcon weather={selectedWeather} size="large" />
        <div>
          <span>{selectedWeather.grade}</span>
          <b>{selectedWeather.title}</b>
          <small>정은님의 날씨는 {selectedWeather.message}</small>
        </div>
      </article>
      <div className="weather-version-meta">
        {ACTIVITY_WEATHER_PRESETS.map((preset) => <button
          key={preset.weatherType}
          type="button"
          className={preset.weatherType === selectedWeather.weatherType ? 'selected' : ''}
          onClick={() => setSelectedWeatherType(preset.weatherType)}
        >
          <ActivityWeatherIcon weather={preset} size="tiny" />
          <div>
            <b>{preset.grade}</b>
            <small>{preset.message}</small>
          </div>
        </button>)}
      </div>
      <Link className="button primary weather-member-preview-link" to={`/activity-weather?preview=${selectedWeather.weatherType}`}>
        회원 화면에서 이 버전 보기 <ArrowRight />
      </Link>
    </section>

    <section className="weather-preview prototype-only">
      <div className="section-heading">
        <h2>점수대별 회원 프리뷰</h2>
        <span>개발 확인용 테스트 회원</span>
      </div>
      <div className="weather-test-member-grid">
        {demoWeatherMembers.map((person) => {
          const weather = { score: person.score, ...gradeFor(person.score) }
          return <Link
            key={person.name}
            className={`weather-test-member weather-bg-${weather.weatherType}`}
            to={`/activity-weather?previewScore=${person.score}&previewName=${encodeURIComponent(person.name)}`}
          >
            <ActivityWeatherIcon weather={weather} size="small" />
            <div>
              <b>{person.name}</b>
              <span>{weather.grade} · {person.score}점</span>
              <small>{person.note}</small>
            </div>
            <ArrowRight />
          </Link>
        })}
      </div>
    </section>
  </>
}
