import { CalendarDays, ChevronRight, ClipboardList, CloudSun, FileText, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getMemberActivityWeather } from '../services/activityWeatherService'
import { getOverview } from '../services/dataService'
import { formatDate, titleOf } from '../utils/display'

export default function ContestHomeScreen() {
  const { member } = useAuth()
  const overview = useQuery(() => getOverview(member.id), [member.id], { initialData: emptyOverview() })
  const weather = useQuery(() => getMemberActivityWeather(member), [member.id])

  if (overview.loading) return <LoadingState />
  if (overview.error) return <ErrorState error={overview.error} retry={overview.retry} />

  const data = overview.data
  const teamIds = new Set(data.memberships.filter((m) => m.member_id === member.id && isActiveMembership(m)).map((m) => m.team_id))
  const myTeams = data.teams.filter((team) => teamIds.has(team.id) || team.leader_id === member.id)
  const myApplications = data.applications.filter((application) => application.applicant_id === member.id && isVisibleApplication(application))
  const activeContests = data.contests.filter((contest) => contest.is_active !== false)
  const nextSchedule = getNextMemberSchedule({ myTeams, myApplications, teams: data.teams, contests: data.contests })

  const cards = [
    {
      to: '/contests/list',
      icon: Trophy,
      color: 'blue',
      title: '공모전',
      description: '진행 중인 공모전과 모집팀을 확인해요',
      meta: `${activeContests.length}개`,
    },
    {
      to: '/my/applications',
      icon: FileText,
      color: 'violet',
      title: '지원 현황',
      description: '지원한 팀의 진행 상태를 확인해요',
      meta: `${myApplications.length}건`,
    },
    {
      to: '/my/teams',
      icon: CalendarDays,
      color: 'green',
      title: '내 팀·일정',
      description: '참여 중인 팀과 주요 일정을 확인해요',
      meta: `${myTeams.length}팀`,
    },
    {
      to: '/activity-weather',
      icon: CloudSun,
      color: 'yellow',
      title: '활동날씨',
      description: '참여와 협업 경험을 확인해요',
      meta: weather.data?.score != null ? `${weather.data.score}점` : '확인',
    },
  ]

  return <div className="contest-home">
    {(overview.warning || data.unavailable?.length > 0) && <div className="partial-data-notice">일부 DB 조회가 지연되어 가능한 정보만 표시 중입니다.</div>}

    <section className="contest-home-hero">
      <div className="contest-home-copy">
        <span>공모전 팀매칭 시스템</span>
        <h1>공모전 홈</h1>
        <p>공모전, 지원 현황, 내 팀과 일정을 확인해보세요.</p>
        <Link to="/my/teams" className="contest-home-pill">현재 참여중인 팀 <strong>{myTeams.length}개</strong><ChevronRight /></Link>
      </div>
      <img src="/assets/hero/contest-hero.webp" alt="" aria-hidden="true" />
    </section>

    <section className="contest-home-grid">
      {cards.map(({ to, icon: Icon, color, title, description, meta }) => <Link className="contest-home-card" to={to} key={title}>
        <span className={`contest-home-icon ${color}`}><Icon /></span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
          <b>{meta}</b>
        </div>
        <ChevronRight />
      </Link>)}
    </section>

    <section className="contest-home-section">
      <div className="mast-section-heading">
        <h2>다가오는 내 일정</h2>
        <Link to="/my/teams">내 팀 보기 <ChevronRight /></Link>
      </div>
      <Link className="contest-home-schedule" to={nextSchedule?.to || '/my/teams'}>
        <span><ClipboardList /></span>
        <div>
          <b>{nextSchedule?.title || '등록된 내 일정이 없습니다'}</b>
          <p>{nextSchedule?.caption || '팀에 합류하거나 지원하면 마감일과 발표일이 표시돼요.'}</p>
        </div>
        <em>{nextSchedule?.dDay || '-'}</em>
      </Link>
    </section>

    <section className="contest-home-section">
      <div className="mast-section-heading">
        <h2>최근 공모전</h2>
        <Link to="/contests/list">전체 보기 <ChevronRight /></Link>
      </div>
      <div className="contest-home-mini-list">
        {activeContests.slice(0, 3).map((contest) => <Link to={`/contests/${contest.id}`} key={contest.id}>
          <b>{titleOf(contest)}</b>
          <span>마감 {formatDate(contest.registration_deadline)}</span>
          <ChevronRight />
        </Link>)}
        {!activeContests.length && <p>현재 노출 중인 공모전이 없습니다.</p>}
      </div>
    </section>
  </div>
}

function getNextMemberSchedule({ myTeams, myApplications, teams, contests }) {
  const contestById = new Map(contests.map((contest) => [contest.id, contest]))
  const teamById = new Map(teams.map((team) => [team.id, team]))
  const events = []

  myTeams.forEach((team) => {
    addContestEvents(events, team.contest || contestById.get(team.contest_id), '내 팀', '/my/teams')
  })

  myApplications.forEach((application) => {
    const team = teamById.get(application.team_id)
    addContestEvents(events, team?.contest || contestById.get(team?.contest_id), '내 지원', '/my/applications')
  })

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null
}

function addContestEvents(events, contest, source, to) {
  if (!contest) return
  ;[
    ['접수마감', contest.registration_deadline],
    ['발표일', contest.presentation_date],
    ['해커톤', contest.hackathon_date],
  ].forEach(([label, value]) => {
    const date = toUpcomingDate(value)
    if (!date) return
    events.push({
      date,
      to,
      title: titleOf(contest),
      caption: `${source} · ${label} ${formatDate(date)}`,
      dDay: toDday(date),
    })
  })
}

function toUpcomingDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today ? date : null
}

function toDday(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'D-DAY'
  return `D-${diff}`
}

function isActiveMembership(membership) {
  return !membership.status || membership.status === 'active' || membership.status === 'accepted'
}

function isVisibleApplication(application) {
  return !application.status || ['pending', 'accepted'].includes(application.status)
}

function emptyOverview() {
  return { contests: [], teams: [], memberships: [], applications: [], announcements: [], notifications: [], unavailable: [] }
}
