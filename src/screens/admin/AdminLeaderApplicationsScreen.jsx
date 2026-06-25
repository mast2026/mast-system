import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { ErrorState, LoadingState, EmptyState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { decideLeaderApplication, getPendingLeaderApplications } from '../../services/leaderService'

export default function AdminLeaderApplicationsScreen() {
  const q = useQuery(getPendingLeaderApplications, [])
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState('')

  const decide = async (id, status) => {
    setBusy(id)
    setNotice('')
    try {
      await decideLeaderApplication(id, status)
      setNotice(status === 'accepted' ? '해당 공모전의 팀 공고 작성 신청을 승인했습니다.' : '신청을 거절했습니다.')
      q.retry()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(null)
    }
  }

  return <>
    <PageHeader title="공모전 팀장 신청 관리" description="회원이 특정 공모전에 팀 공고를 올릴 수 있도록 신청한 건을 검토하세요." />
    {notice && <div className="form-notice">{notice}</div>}
    {q.loading ? <LoadingState /> : q.error ? <ErrorState error={q.error} retry={q.retry} /> : !q.data.length ? <EmptyState title="대기 중인 신청이 없어요" /> : <div className="review-list">
      {q.data.map((application) => <article key={application.id}>
        <div>
          <h3>{application.member?.name || '회원'} · {application.contest?.title || '공모전 선택 없음'}</h3>
          <small>{application.member?.generation ? `${application.member.generation}기` : '기수 미등록'} · 공모전별 팀 공고 작성 신청</small>
          <p className="pre-line">{application.display_message || application.message}</p>
        </div>
        <div className="card-actions">
          <button className="button accept" disabled={busy === application.id} onClick={() => decide(application.id, 'accepted')}>승인</button>
          <button className="button danger" disabled={busy === application.id} onClick={() => decide(application.id, 'rejected')}>거절</button>
        </div>
      </article>)}
    </div>}
  </>
}
