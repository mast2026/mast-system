import {
  Award,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Clock,
  Flag,
  UsersRound,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { contestDeadlineEnd, getContestById, isContestOpen } from '../services/contestService'
import { getMyLeaderApplication } from '../services/leaderService'
import { getEnrichedTeams } from '../services/teamService'
import { formatDate, safeHttpUrl } from '../utils/display'

export default function ContestDetailScreen() {
  const { id } = useParams()
  const { member } = useAuth()
  const q = useQuery(async () => {
    const [contest, allTeams, leaderApplication] = await Promise.all([
      getContestById(id),
      getEnrichedTeams(),
      member?.id ? getMyLeaderApplication(member.id, id).catch(() => null) : Promise.resolve(null),
    ])
    const isVisibleContest = contest?.is_active !== false && isContestOpen(contest)
    const contestTeams = isVisibleContest ? allTeams.filter((team) => String(team.contest_id) === String(id)) : []
    return {
      contest: isVisibleContest ? contest : null,
      teams: contestTeams.filter((team) => team.status === 'recruiting'),
      allTeams: contestTeams,
      leaderApplication,
    }
  }, [id, member?.id])

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  if (!q.data.contest) return <EmptyState title="공모전을 찾을 수 없어요" description="접수 마감 또는 비공개 처리된 공모전입니다." />

  const contest = q.data.contest
  const dday = getDday(contest.registration_deadline)
  const officialUrl = safeHttpUrl(contest.link)
  const myLeaderTeam = q.data.allTeams.find((team) => Number(team.leader_id) === Number(member?.id))

  return (
    <div className="contest-detail-v2">
      <PageHeader title={contest.title || '공모전 상세'} description={contest.organizer || '주최기관 미정'} back />

      <section className="contest-summary-v2">
        <div>
          <span className="blue"><UsersRound /></span>
          <p>모집중 팀<b>{q.data.teams.length}개</b></p>
        </div>
        <div>
          <span className="violet"><CalendarDays /></span>
          <p>접수마감<b>{dday}</b></p>
        </div>
        <div>
          <span className="yellow"><Award /></span>
          <p>최고상<b>{contest.prize || '-'}</b></p>
        </div>
      </section>

      <nav className="contest-tabs">
        <a href="#intro">소개</a>
        <a href="#schedule">일정</a>
        <a href="#teams">모집팀 <b>{q.data.teams.length}</b></a>
      </nav>

      <section id="intro" className="contest-info-v2">
        <p>{contest.description || '상세 소개가 아직 등록되지 않았어요.'}</p>
        <InfoRow icon={UsersRound} label="참가대상" value={`최대 ${contest.max_team_size || '-'}명 팀 구성`} />
        <InfoRow icon={Building2} label="주최" value={contest.organizer} />
        <InfoRow icon={Flag} label="모집 분야" value={contest.category} />
        <InfoRow icon={Award} label="시상내역" value={contest.prize} />
        <InfoRow icon={CircleHelp} label="추가 안내" value={contest.notes} />
        {officialUrl && (
          <a className="contest-link" href={officialUrl} target="_blank" rel="noreferrer">
            공모전 공식 페이지 <ChevronRight />
          </a>
        )}
      </section>

      <section id="schedule" className="contest-schedule-v2">
        <h2>주요 일정</h2>
        <div><Clock /><span>접수 기간</span><b>{contest.registration_period || formatDate(contest.registration_deadline)}</b></div>
        {contest.presentation_date && <div><CalendarDays /><span>결과 발표일</span><b>{formatDate(contest.presentation_date)}</b></div>}
        {contest.hackathon_date && <div><CalendarDays /><span>해커톤 일정</span><b>{formatDate(contest.hackathon_date)}</b></div>}
      </section>

      <section id="teams" className="contest-teams-v2">
        <div className="mast-section-heading"><h2>현재 모집중인 팀 <b>{q.data.teams.length}개</b></h2></div>
        {!q.data.teams.length ? (
          <EmptyState title="이 공모전의 모집 팀이 아직 없어요" />
        ) : (
          <div>
            {q.data.teams.map((team) => (
              <Link className="contest-team-card" key={team.id} to={`/teams/${team.id}`}>
                <span className="team-avatar"><UsersRound /></span>
                <div>
                  <h3>{team.leader?.name || '팀장'}님의 팀 <small>{team.current_members || 1}/{team.required_members}명 모집중</small></h3>
                  <p>활동 방식　|　{team.work_style || '협의'}</p>
                  <div className="tag-row">{(team.needed_roles || []).slice(0, 4).map((role) => <span key={role}>#{role}</span>)}</div>
                </div>
                <ChevronRight />
              </Link>
            ))}
          </div>
        )}
      </section>

      <ContestLeaderAction contest={contest} application={q.data.leaderApplication} myTeam={myLeaderTeam} />
    </div>
  )
}

function ContestLeaderAction({ contest, application, myTeam }) {
  if (myTeam) {
    return <Link className="contest-create-cta" to={`/teams/${myTeam.id}/manage`}>
      <UsersRound />내 팀 관리하기<ChevronRight />
    </Link>
  }
  if (application?.status === 'accepted') {
    return <Link className="contest-create-cta" to={`/teams/new?contest=${contest.id}`}>
      <UsersRound />승인 완료 · 팀 공고 만들기<ChevronRight />
    </Link>
  }
  if (application?.status === 'pending') {
    return <div className="contest-create-cta is-disabled" role="status">
      <UsersRound />팀장 신청 검토 중
    </div>
  }
  if (application?.status === 'rejected') {
    return <Link className="contest-create-cta" to={`/leader-application?contest=${contest.id}`}>
      <UsersRound />팀장 신청 다시 하기<ChevronRight />
    </Link>
  }
  return <Link className="contest-create-cta" to={`/leader-application?contest=${contest.id}`}>
    <UsersRound />이 공모전 팀장 신청하기<ChevronRight />
  </Link>
}

function InfoRow({ icon: Icon, label, value }) {
  return value ? (
    <div className="contest-info-row">
      <Icon />
      <b>{label}</b>
      <span>{value}</span>
    </div>
  ) : null
}

function getDday(value) {
  if (!value) return '마감일 미정'
  const date = contestDeadlineEnd(value)
  if (!date || Number.isNaN(date.getTime())) return '마감일 미정'
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000)
  return diff >= 0 ? `D-${diff}` : '접수 마감'
}
