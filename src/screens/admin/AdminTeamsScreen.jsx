import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import AdminTable from '../../components/AdminTable'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { deleteAdminTeamPost, getAdminTeams, updateAdminTeamStatus } from '../../services/adminService'

const statuses = ['recruiting', 'matched']
const statusLabels = { recruiting: '모집 중', matched: '팀 확정', closed: '팀 확정', finished: '팀 확정', pending: '검토 중', accepted: '승인', rejected: '반려' }

export default function AdminTeamsScreen() {
  const q = useQuery(getAdminTeams, [])
  const [notice, setNotice] = useState('')
  const updateStatus = async (team, status) => {
    setNotice('')
    try { await updateAdminTeamStatus(team.id, status); setNotice('팀 상태를 변경했습니다.'); q.retry() }
    catch (error) { setNotice(error.message) }
  }
  const removeTeam = async (team) => {
    if (!window.confirm(`${team.contest?.title || '공모전'}의 팀 공고를 삭제할까요?`)) return
    setNotice('')
    try { await deleteAdminTeamPost(team.id); setNotice('팀 공고를 삭제했습니다.'); q.retry() }
    catch (error) { setNotice(error.message) }
  }
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const rows = q.data
  return <>
    <PageHeader title="팀 공고" description="회원 화면에 노출되는 모집 공고 상태만 관리합니다. 팀 확정으로 바꾸면 모집 공고에서 내려갑니다." />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={rows} searchPlaceholder="공모전, 팀장, 팀 소개 검색" getSearchText={(row) => `${row.contest?.title} ${row.leader?.name} ${row.introduction} ${row.status}`}
      filters={[{ key: 'status', label: '상태', value: (row) => row.status, options: statuses.map((value) => ({ value, label: statusLabels[value] })) }]}
      columns={[
        { key: 'contest', label: '공모전', render: (row) => row.contest?.title || '-' },
        { key: 'leader', label: '팀장', render: (row) => row.leader?.name || '-' },
        { key: 'members', label: '전체 인원', render: (row) => `${teamTotalMembers(row)}/${row.required_members ?? '-'}` },
        { key: 'status', label: '상태', render: (row) => <select className="table-select" value={row.status === 'recruiting' ? 'recruiting' : 'matched'} onChange={(event) => updateStatus(row, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select> },
        { key: 'open_chat_url', label: '오픈채팅', render: (row) => row.hasOpenChat ? '등록' : '미등록' },
        { key: 'note', label: '관리 위치', render: () => <Badge value="팀매칭 관리에서 상세 확인" /> },
        { key: 'delete', label: '삭제', render: (row) => <button className="table-button danger" type="button" onClick={() => removeTeam(row)}><Trash2 />삭제</button> },
      ]} />
  </>
}

function teamTotalMembers(team) {
  const ids = new Set()
  if (team?.leader_id) ids.add(Number(team.leader_id))
  ;(team?.members ?? []).forEach((link) => {
    if (!link.status || link.status === 'active') ids.add(Number(link.member_id))
  })
  return Math.max(1, ids.size || Number(team?.current_members ?? 0))
}
