import { Link, useSearchParams } from 'react-router-dom'
import { FileText, Home, MessageSquareText, ShieldCheck, Trophy, UsersRound } from 'lucide-react'
import AdminApplicationsScreen from './AdminApplicationsScreen'
import AdminAwardsScreen from './AdminAwardsScreen'
import AdminContestsScreen from './AdminContestsScreen'
import AdminLeaderApplicationsScreen from './AdminLeaderApplicationsScreen'
import AdminPeerReviewsScreen from './AdminPeerReviewsScreen'
import AdminTeamsScreen from './AdminTeamsScreen'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { getAdminTeams } from '../../services/adminService'

const tabs = [
  ['contests', '공모전', Trophy],
  ['leader-applications', '팀장 신청', ShieldCheck],
  ['teams', '팀 공고', UsersRound],
  ['applications', '팀매칭 관리', FileText],
  ['results', '결과/동료평가', MessageSquareText],
]

export default function AdminContestHubScreen() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'contests'
  const setTab = (next) => setParams({ tab: next })

  return <div className="admin-hub-page">
    <nav className="admin-inner-tabs admin-management-tabs admin-contest-tabs" aria-label="공모전 관리 메뉴">
      <Link className="admin-icon-button mini" to="/admin" aria-label="관리자 메인"><Home /></Link>
      {tabs.map(([key, label, Icon]) => <button key={key} title={label} aria-label={label} className={tab === key ? 'active' : ''} type="button" onClick={() => setTab(key)}>
        <Icon />
        <span>{label}</span>
      </button>)}
    </nav>

    {tab === 'contests' && <AdminContestsScreen compact />}
    {tab === 'leader-applications' && <AdminLeaderApplicationsScreen />}
    {tab === 'teams' && <AdminTeamsScreen />}
    {tab === 'applications' && <AdminApplicationsScreen />}
    {tab === 'results' && <div className="admin-contest-results-grid">
      <ContestResultOverview />
      <section><AdminAwardsScreen /></section>
      <section><AdminPeerReviewsScreen /></section>
    </div>}
  </div>
}

function ContestResultOverview() {
  const q = useQuery(getAdminTeams, [])
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const grouped = groupByContest((q.data ?? []).filter((team) => team.status && team.status !== 'recruiting'))

  return <section className="admin-result-overview">
    <header>
      <span>RESULT FLOW</span>
      <h2>공모전별 팀 결과/동료평가</h2>
      <p>공모전 종료 후 팀을 확인하고 결과 등록, 동료평가 승인 순서로 활동날씨에 반영합니다.</p>
    </header>
    <div className="admin-result-contest-list">
      {grouped.length ? grouped.map(([contestTitle, teams]) => <article key={contestTitle}>
        <div>
          <b>{contestTitle}</b>
          <small>{teams.length}개 확정 팀</small>
        </div>
        <div className="mini-list">
          {teams.map((team) => <div className="admin-result-team-link" key={team.id}>
            <span>{team.leader?.name || '팀장'} 팀 · {team.members?.length ?? 0}명</span>
            <Badge value={team.hasOpenChat ? '오픈채팅 등록' : '오픈채팅 미등록'} />
            <small>결과 등록/수정 · 동료평가 승인</small>
            <div className="table-actions">
              <Link className="table-button" to={`/admin/teams/${team.id}/result`}>결과</Link>
              <Link className="table-button" to={`/admin/peer-reviews?teamId=${team.id}`}>평가</Link>
            </div>
          </div>)}
        </div>
      </article>) : <div className="admin-empty-card">확정된 팀이 없습니다.</div>}
    </div>
  </section>
}

function groupByContest(teams) {
  const map = new Map()
  teams.forEach((team) => {
    const title = team.contest?.title || `공모전 ${team.contest_id || '-'}`
    if (!map.has(title)) map.set(title, [])
    map.get(title).push(team)
  })
  return [...map.entries()]
}
