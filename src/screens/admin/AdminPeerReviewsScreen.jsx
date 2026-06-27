import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import AdminTable from '../../components/AdminTable'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { applyPeerReviewAwards, getAdminPeerReviews, updateAdminPeerReviewStatus } from '../../services/adminService'

export default function AdminPeerReviewsScreen() {
  const [params] = useSearchParams()
  const teamId = params.get('teamId')
  const q = useQuery(getAdminPeerReviews, [])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const applyAwards = async () => {
    if (!window.confirm('팀별·항목별(존중·아이디어·융통성) 평균 1위에게 +1점을 반영합니다. 다시 누르면 이전 동료평가 가점을 지우고 재계산합니다. 진행할까요?')) return
    setBusy(true); setNotice('')
    try {
      const { winners, teams } = await applyPeerReviewAwards()
      setNotice(`동료평가 결과 반영 완료 — ${teams}개 팀, 항목별 1위 총 ${winners}건에 +1점.`)
    } catch (error) {
      setNotice(`결과 반영 실패: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }
  const decide = async (row, status) => {
    setBusy(true)
    setNotice('')
    try {
      await updateAdminPeerReviewStatus(row.id, status)
      setNotice(status === 'approved' ? '동료평가를 승인했습니다. 활동날씨 계산에 반영됩니다.' : '동료평가를 거부했습니다.')
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const rows = teamId ? (q.data ?? []).filter((row) => String(row.team_id) === String(teamId)) : q.data
  return <>
    <PageHeader title="동료평가 관리" description={teamId ? '선택한 팀의 동료평가를 승인/거부합니다.' : '항목: 존중·아이디어·융통성(각 1~5점). 결과 반영 시 팀별 항목 1위에게 +1점.'} action={<button className="button primary" disabled={busy} onClick={applyAwards}>결과 반영(항목 1위 +1)</button>} />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={rows} searchPlaceholder="평가자, 대상자, 코멘트 검색" getSearchText={(row) => `${row.reviewer?.name} ${row.reviewee?.name} ${row.comment} ${row.comments} ${row.status}`}
      columns={[
        { key: 'reviewer', label: '평가자', render: (row) => row.reviewer?.name || '-' },
        { key: 'reviewee', label: '평가대상자', render: (row) => row.reviewee?.name || '-' },
        { key: 'team', label: '팀', render: (row) => row.team?.introduction || '팀 공고' },
        { key: 'status', label: '승인', render: (row) => <Badge value={reviewStatusLabel(row.status)} /> },
        { key: 'participation', label: '존중', render: (row) => row.participation ?? row.participation_score ?? '-' },
        { key: 'collaboration', label: '아이디어', render: (row) => row.collaboration ?? row.collaboration_score ?? '-' },
        { key: 'communication', label: '융통성', render: (row) => row.communication ?? row.communication_score ?? '-' },
        { key: 'comment', label: '코멘트', render: (row) => row.comment || row.comments || '-' },
        { key: 'manage', label: '관리', render: (row) => <div className="table-actions"><button className="table-button" disabled={busy} onClick={() => decide(row, 'approved')}>승인</button><button className="table-button danger" disabled={busy} onClick={() => decide(row, 'rejected')}>거부</button></div> },
      ]} />
  </>
}

function reviewStatusLabel(status) {
  if (status === 'approved') return '승인'
  if (status === 'rejected') return '거부'
  if (status === 'pending') return '대기'
  return status || '검토 전'
}
