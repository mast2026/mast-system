import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, LogOut } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { approveLeaveRequest, getLeaveRequests, rejectLeaveRequest } from '../../services/adminService'

export default function AdminLeaveRequestsScreen() {
  const q = useQuery(getLeaveRequests, [])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const decide = async (link, approve) => {
    const name = link.member?.name || '팀원'
    if (!window.confirm(approve ? `${name}님의 탈퇴를 승인할까요? 팀에서 제외됩니다.` : `${name}님의 탈퇴 신청을 반려할까요? 다시 팀원으로 유지됩니다.`)) return
    setBusy(true); setNotice('')
    try {
      await (approve ? approveLeaveRequest(link.id) : rejectLeaveRequest(link.id))
      setNotice(approve ? `${name}님의 탈퇴를 승인했습니다.` : `${name}님의 탈퇴 신청을 반려했습니다.`)
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (q.loading) return <LoadingState label="탈퇴 신청을 불러오는 중" />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const rows = q.data ?? []

  return <>
    <div className="admin-inner-tabs" style={{ marginBottom: 12 }}>
      <Link className="admin-icon-button mini" to="/admin" aria-label="관리자 홈"><Home /></Link>
    </div>
    <PageHeader title="팀 탈퇴 신청" description="팀원이 신청한 탈퇴를 승인하거나 반려합니다. 승인 시 팀에서 제외됩니다." />
    {notice && <div className="form-notice">{notice}</div>}
    {!rows.length ? <EmptyState title="대기 중인 탈퇴 신청이 없어요" description="팀원이 탈퇴를 신청하면 여기에 표시됩니다." /> : (
      <div className="leave-request-list">
        {rows.map((link) => <article className="leave-request-card" key={link.id}>
          <div className="leave-request-head">
            <span className="leave-request-avatar"><LogOut /></span>
            <div>
              <b>{link.member?.name || `회원 ${link.member_id}`}</b>
              <small>{link.contest?.title || '공모전'} · {link.member?.school || '-'} · {link.member?.gi || link.member?.generation || ''}</small>
            </div>
          </div>
          <p className="leave-request-reason">사유: {link.leave_reason || '사유 미입력'}</p>
          <div className="leave-request-actions">
            <button className="button danger small" disabled={busy} onClick={() => decide(link, true)}>탈퇴 승인</button>
            <button className="button secondary small" disabled={busy} onClick={() => decide(link, false)}>반려(유지)</button>
          </div>
        </article>)}
      </div>
    )}
  </>
}
