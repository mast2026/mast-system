import { useState } from 'react'
import { ExternalLink, Info, LogOut, MessageSquareText, Settings, Trophy, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { Field, FormActions } from '../components/FormControls'
import { ErrorState, LoadingState, EmptyState } from '../components/States'
import { resultLabel } from '../constants/results'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getAllContests } from '../services/contestService'
import { ensureTeamsForAcceptedLeaderApplications } from '../services/leaderService'
import { getMyTeams, leaveTeam } from '../services/teamService'
import { safeHttpUrl } from '../utils/display'

export default function MyTeamScreen() {
  const { member } = useAuth()
  const q = useQuery(async () => {
    const approvals = await ensureTeamsForAcceptedLeaderApplications(member.id)
    const [teams, contests] = await Promise.all([
      getMyTeams(member.id),
      getAllContests(),
    ])
    const contestsById = new Map((contests ?? []).map((contest) => [Number(contest.id), contest]))
    const createdContestIds = new Set((teams ?? [])
      .filter((team) => Number(team.leader_id) === Number(member.id))
      .map((team) => Number(team.contest_id)))
    const approvedWithoutTeam = approvals
      .filter((application) => application.contest_id && !createdContestIds.has(Number(application.contest_id)))
      .map((application) => ({ ...application, contest: contestsById.get(Number(application.contest_id)) }))
      .filter((application) => application.contest)
    return { teams, approvedWithoutTeam }
  }, [member.id])
  const [leaving, setLeaving] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const submitLeave = async () => {
    setBusy(true)
    setNotice('')
    try {
      await leaveTeam(leaving.id, member.id, reason)
      setLeaving(null)
      setReason('')
      setNotice('팀에서 나왔습니다.')
      q.retry()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <PageHeader title="내 팀" description="내가 이끌거나 팀원으로 참여 중인 팀이에요." action={<Link className="button primary small" to="/leader-application">팀장 신청</Link>} />
    {notice && <div className="form-notice">{notice}</div>}
    {q.loading ? <LoadingState /> : q.error ? <ErrorState error={q.error} retry={q.retry} /> : (!q.data.teams.length && !q.data.approvedWithoutTeam.length) ? <EmptyState title="참여 중인 팀이 없어요" /> : <div className="my-team-list">
      {q.data.approvedWithoutTeam.map((application) => <ApprovedLeaderApplicationCard key={`approved-${application.id}`} application={application} />)}
      {q.data.teams.map((team) => {
        const isLeader = Number(team.leader_id) === Number(member.id)
        const chatUrl = team.canViewChat && safeHttpUrl(team.open_chat_url)
        const isFinished = team.status === 'finished' || Boolean(team.award_result)
        return <article className="my-team-card" key={team.id}>
          <div className="card-heading">
            <div>
              <small>{team.contest?.title || '공모전'}</small>
              <h3>{isLeader ? '내가 이끄는 팀' : '참여 중인 팀'}</h3>
            </div>
            <Badge value={team.status} />
          </div>
          <p>{team.introduction || '팀 소개가 없습니다.'}</p>
          <div className="team-facts">
            <span>👥 {team.current_members}/{team.required_members}명</span>
            <span>🧭 {team.work_style || '협의'}</span>
          </div>
          {team.status === 'matched' && <div className="correction-notice compact">
            <Info />
            <div>
              <b>팀매칭 정정기간</b>
              <p>완료 제출 후 7일 동안 팀 구성 정정기간입니다. 탈퇴가 필요한 경우 사유를 남기면 운영진에게 전달됩니다.</p>
            </div>
          </div>}
          {isFinished && <div className="result-panel">
            <div>
              <small>공모전 결과</small>
              <b>{resultLabel(team.award_result)}</b>
            </div>
            {team.peer_review_open ? <Link className="button primary small" to={`/teams/${team.id}/peer-review`}><MessageSquareText />동료평가</Link> : <span className="muted-chip">동료평가 대기</span>}
          </div>}
          <div className="my-team-actions">
            <Link className="button secondary" to={`/teams/${team.id}`}>팀 상세</Link>
            {chatUrl && <a className="button chat-button" href={chatUrl} target="_blank" rel="noreferrer"><ExternalLink />오픈채팅방 입장하기</a>}
            {isLeader ? <>
              <Link className="button primary" to={`/teams/${team.id}/applicants`}><UsersRound />지원자 보기</Link>
              <Link className="button secondary" to={`/teams/${team.id}/manage`}><Settings />팀 관리</Link>
              <Link className="button secondary" to={`/teams/${team.id}/result`}><Trophy />결과 등록</Link>
            </> : <button className="button danger" disabled={!team.capabilities.membershipOperations} title={!team.capabilities.membershipOperations ? 'DB 컬럼 추가 필요' : ''} onClick={() => setLeaving(team)}><LogOut />팀 탈퇴</button>}
          </div>
          {!isLeader && !team.capabilities.membershipOperations && <small className="disabled-hint">DB 컬럼 추가 필요 · 팀 나가기 기능이 비활성화되어 있습니다.</small>}
        </article>
      })}
    </div>}
    {leaving && <Modal title="팀에서 탈퇴할까요?" onClose={() => setLeaving(null)}>
      <p className="modal-copy">탈퇴 사유는 운영진에게 전달됩니다. 탈퇴 후 다시 참여하려면 해당 팀에 새로 지원해야 합니다.</p>
      <form className="data-form" onSubmit={(e) => { e.preventDefault(); submitLeave() }}>
        <Field label="탈퇴 사유" required>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="운영진이 확인할 수 있도록 탈퇴 사유를 입력해 주세요." />
        </Field>
        <FormActions submitting={busy} submitLabel="팀 탈퇴" onCancel={() => setLeaving(null)} />
      </form>
    </Modal>}
  </>
}

function ApprovedLeaderApplicationCard({ application }) {
  return <article className="my-team-card leader-approved-card">
    <div className="card-heading">
      <div>
        <small>{application.contest?.title || '공모전'}</small>
        <h3>승인된 팀장 신청</h3>
      </div>
      <Badge value="accepted" />
    </div>
    <p>팀장 신청은 승인되었습니다. 새 승인건은 신청서 내용 그대로 모집공고가 자동 등록되며, 등록된 팀은 이 화면에서 지원자 보기로 관리합니다.</p>
    <div className="my-team-actions">
      <Link className="button secondary" to={`/contests/${application.contest_id}`}>공모전 보기</Link>
      <Link className="button secondary" to="/my/applications">신청 현황</Link>
    </div>
  </article>
}
