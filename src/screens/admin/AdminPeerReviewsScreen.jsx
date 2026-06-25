import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import AdminTable from '../../components/AdminTable'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { getAdminPeerReviews, updateAdminPeerReviewStatus } from '../../services/adminService'

export default function AdminPeerReviewsScreen() {
  const [params] = useSearchParams()
  const teamId = params.get('teamId')
  const q = useQuery(getAdminPeerReviews, [])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
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
    <PageHeader title="동료평가 관리" description={teamId ? '선택한 팀의 동료평가를 승인/거부합니다.' : '평가자, 평가대상자, 팀, 평가 항목과 코멘트를 확인합니다.'} />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={rows} searchPlaceholder="평가자, 대상자, 코멘트 검색" getSearchText={(row) => `${row.reviewer?.name} ${row.reviewee?.name} ${row.comment} ${row.comments} ${row.status}`}
      columns={[
        { key: 'reviewer', label: '평가자', render: (row) => row.reviewer?.name || '-' },
        { key: 'reviewee', label: '평가대상자', render: (row) => row.reviewee?.name || '-' },
        { key: 'team', label: '팀', render: (row) => row.team?.introduction || '팀 공고' },
        { key: 'status', label: '승인', render: (row) => <Badge value={reviewStatusLabel(row.status)} /> },
        { key: 'participation', label: '참여도', render: (row) => row.participation ?? row.participation_score ?? '-' },
        { key: 'sincerity', label: '성실도', render: (row) => row.sincerity ?? row.sincerity_score ?? '-' },
        { key: 'collaboration', label: '협업도', render: (row) => row.collaboration ?? row.collaboration_score ?? '-' },
        { key: 'communication', label: '소통', render: (row) => row.communication ?? row.communication_score ?? '-' },
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
