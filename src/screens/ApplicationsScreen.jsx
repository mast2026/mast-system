import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, Trash2, XCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { deleteMyApplication, getMyApplicationDashboard } from '../services/applicationService'
import { deleteMyLeaderApplication } from '../services/leaderService'
import { formatDate } from '../utils/display'

const statusCopy = {
  pending: { title: '검토 중', desc: '팀장이 지원서를 확인하고 있어요.', icon: Clock3 },
  accepted: { title: '승인됨', desc: '팀에 합류했어요. 내 팀에서 일정과 팀 정보를 확인하세요.', icon: CheckCircle2 },
  rejected: { title: '반려됨', desc: '다른 팀에 다시 지원할 수 있어요.', icon: XCircle },
}

export default function ApplicationsScreen() {
  const { member } = useAuth()
  const q = useQuery(() => getMyApplicationDashboard(member.id), [member.id])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const leaderApplications = q.data?.leaderApplications ?? []
  const teamApplications = q.data?.teamApplications ?? []
  const hasRows = leaderApplications.length || teamApplications.length

  const removeTeamApp = async (application) => {
    if (!window.confirm('이 팀원 지원 내역을 삭제할까요?')) return
    setBusy(true); setNotice('')
    try { await deleteMyApplication(application.id, member.id); setNotice('지원 내역을 삭제했습니다.'); q.retry() }
    catch (e) { setNotice(e.message) } finally { setBusy(false) }
  }
  const removeLeaderApp = async (application) => {
    if (!window.confirm('이 팀장 신청 내역을 삭제할까요?')) return
    setBusy(true); setNotice('')
    try { await deleteMyLeaderApplication(application.id, member.id); setNotice('팀장 신청 내역을 삭제했습니다.'); q.retry() }
    catch (e) { setNotice(e.message) } finally { setBusy(false) }
  }

  return <>
    <PageHeader title="내 지원 현황" description="팀장 신청과 팀원 지원 상태를 함께 확인하세요." />
    {notice && <div className="form-notice">{notice}</div>}
    {q.loading ? <LoadingState /> : q.error ? <ErrorState error={q.error} retry={q.retry} /> : !hasRows ? <EmptyState title="아직 신청 내역이 없어요" description="공모전 상세에서 팀장 신청 또는 모집 중인 팀 지원을 할 수 있습니다." /> : <div className="application-status-wrap">
      <section className="application-status-section">
        <div className="section-title-row">
          <h2>팀장 신청 현황</h2>
          <small>{leaderApplications.length}건</small>
        </div>
        {leaderApplications.length ? <div className="application-status-list">
          {leaderApplications.map((application) => <LeaderApplicationCard key={application.id} application={application} onDelete={removeLeaderApp} busy={busy} />)}
        </div> : <EmptyState title="팀장 신청 내역이 없어요" description="공모전별로 팀 공고 작성 신청을 할 수 있습니다." />}
      </section>

      <section className="application-status-section">
        <div className="section-title-row">
          <h2>팀원 지원 현황</h2>
          <small>{teamApplications.length}건</small>
        </div>
        {teamApplications.length ? <div className="application-status-list">
      {teamApplications.map((application) => {
        const status = statusCopy[application.status] ?? statusCopy.pending
        const Icon = status.icon
        return <article className={`application-status-card status-${application.status}`} key={application.id}>
          <div className="application-status-head">
            <span><Icon /></span>
            <div>
              <small>{application.contest?.title || '공모전'}</small>
              <h3>{application.team?.leader?.name ? `${application.team.leader.name} 팀` : application.team?.introduction?.slice(0, 28) || '팀 지원서'}</h3>
            </div>
            <Badge value={application.status} />
          </div>
          <div className="application-status-body">
            <b>{status.title}</b>
            <p>{status.desc}</p>
            <dl>
              <div><dt>희망 역할</dt><dd>{application.survey_role || '-'}</dd></div>
              <div><dt>지원일</dt><dd>{formatDate(application.created_at)}</dd></div>
              {application.reject_reason && <div><dt>반려 사유</dt><dd>{application.reject_reason}</dd></div>}
            </dl>
          </div>
          <div className="application-status-actions">
            {application.status === 'accepted'
              ? <Link className="button primary small" to="/my/teams">내 팀 확인 <ArrowRight /></Link>
            : application.team?.id
                ? <Link className="button secondary small" to={`/teams/${application.team.id}`}>팀 공고 보기 <ArrowRight /></Link>
                : <Link className="button secondary small" to="/teams">팀 찾기 <ArrowRight /></Link>}
            <button className="button danger small" disabled={busy} onClick={() => removeTeamApp(application)}><Trash2 /> 삭제</button>
          </div>
        </article>
      })}
        </div> : <EmptyState title="팀원 지원 내역이 없어요" description="모집 중인 팀 공고에서 지원할 수 있습니다." />}
      </section>
    </div>}
  </>
}

function LeaderApplicationCard({ application, onDelete, busy }) {
  const status = statusCopy[application.status] ?? statusCopy.pending
  const Icon = status.icon
  const contestTitle = application.contest?.title || '공모전'
  const accepted = application.status === 'accepted'
  const hasTeam = Boolean(application.team?.id)
  return <article className={`application-status-card status-${application.status}`}>
    <div className="application-status-head">
      <span><Icon /></span>
      <div>
        <small>{contestTitle}</small>
        <h3>팀장 신청</h3>
      </div>
      <Badge value={application.status} />
    </div>
    <div className="application-status-body">
      <b>{accepted ? (hasTeam ? '모집공고 등록 완료' : '승인 완료') : status.title}</b>
      <p>{accepted ? (hasTeam ? '승인된 신청서 내용 그대로 팀 공고가 등록되었습니다. 내 팀에서 지원자를 관리할 수 있어요.' : '승인은 완료되었습니다. 이후 승인부터는 신청서 내용으로 모집공고가 자동 등록됩니다.') : application.status === 'pending' ? '운영진이 공모전별 팀 공고 작성 신청을 검토하고 있어요.' : '반려된 신청은 내용을 보완해 다시 신청할 수 있습니다.'}</p>
      <dl>
        <div><dt>신청 공모전</dt><dd>{contestTitle}</dd></div>
        <div><dt>신청 내용</dt><dd>{application.display_message || '-'}</dd></div>
        {application.created_at && <div><dt>신청일</dt><dd>{formatDate(application.created_at)}</dd></div>}
      </dl>
    </div>
    <div className="application-status-actions">
      {accepted && hasTeam
        ? <Link className="button primary small" to="/my/teams">내 팀 확인 <ArrowRight /></Link>
        : application.contest_id
          ? <Link className="button secondary small" to={`/leader-application?contest=${application.contest_id}`}>신청 화면 보기 <ArrowRight /></Link>
          : <Link className="button secondary small" to="/leader-application">팀장 신청 <ArrowRight /></Link>}
      <button className="button danger small" disabled={busy} onClick={() => onDelete(application)}><Trash2 /> 삭제</button>
    </div>
  </article>
}
