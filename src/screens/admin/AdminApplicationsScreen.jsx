import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareText, Trophy, UsersRound } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import AdminTable from '../../components/AdminTable'
import Modal from '../../components/Modal'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { addAdminTeamMember, getAdminTeams, updateAdminTeamLeader, updateAdminTeamMemberStatus } from '../../services/adminService'

const statusLabels = {
  recruiting: '모집 중',
  matched: '팀 확정',
  closed: '팀 확정',
  finished: '완료',
  active: '활동 중',
  left: '탈퇴 요청/탈퇴',
  removed: '제외',
  accepted: '승인',
  pending: '검토 중',
  rejected: '반려',
}

export default function AdminApplicationsScreen() {
  const q = useQuery(getAdminTeams, [])
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const mutate = async (action, message) => {
    setBusy(true)
    setNotice('')
    try {
      await action()
      setNotice(message)
      setSelected(null)
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />

  const matchedTeams = (q.data ?? []).filter((team) => team.status && team.status !== 'recruiting')

  return <>
    <PageHeader
      title="팀매칭 관리"
      description="팀 확정 이후의 팀장·팀원 구성, 탈퇴 요청, 결과 등록, 동료평가 승인 흐름을 관리합니다."
    />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable
      rows={matchedTeams}
      searchPlaceholder="공모전, 팀장, 팀원, 팀 소개 검색"
      getSearchText={(row) => `${row.contest?.title} ${row.leader?.name} ${row.members?.map((item) => item.member?.name).join(' ')} ${row.introduction} ${row.status}`}
      columns={[
        { key: 'contest', label: '공모전', render: (row) => row.contest?.title || '-' },
        { key: 'leader', label: '팀장', render: (row) => row.leader?.name || '-' },
        { key: 'members', label: '팀원', render: (row) => `${activeMembers(row).length}/${row.required_members ?? '-'}` },
        { key: 'status', label: '상태', render: (row) => <Badge value={statusLabels[row.status] || row.status || '팀 확정'} /> },
        { key: 'open_chat_url', label: '오픈채팅', render: (row) => row.hasOpenChat ? '등록' : '미등록' },
        { key: 'manage', label: '관리', render: (row) => <div className="table-actions"><button className="table-button" onClick={() => setSelected(row)}>팀 확인</button><Link className="table-button" to={`/admin/teams/${row.id}/result`}>결과</Link><Link className="table-button" to={`/admin/peer-reviews?teamId=${row.id}`}>평가</Link></div> },
      ]}
    />

    {selected && <Modal title="팀매칭 상세" onClose={() => setSelected(null)} wide>
      <div className="admin-matching-detail">
        <section className="admin-detail-grid">
          <Info label="공모전" value={selected.contest?.title} />
          <Info label="팀장" value={selected.leader?.name} />
          <Info label="상태" value={statusLabels[selected.status] || selected.status} />
          <Info label="오픈채팅" value={selected.hasOpenChat ? '등록됨' : '미등록'} />
        </section>

        <section className="admin-matching-box">
          <h3><UsersRound /> 팀장/팀원</h3>
          <div className="admin-team-edit-controls">
            <label>
              <span>팀장 변경</span>
              <select disabled={busy} value={selected.leader_id || ''} onChange={(event) => mutate(() => updateAdminTeamLeader(selected.id, event.target.value), '팀장을 변경했습니다.')}>
                <option value="">팀장 선택</option>
                {memberOptions(selected).map((member) => <option value={member.id} key={member.id}>{member.name} · {member.school || '-'}</option>)}
              </select>
            </label>
            <label>
              <span>팀원 추가</span>
              <select disabled={busy} value="" onChange={(event) => event.target.value && mutate(() => addAdminTeamMember(selected.id, event.target.value), '팀원을 추가했습니다.')}>
                <option value="">추가할 회원 선택</option>
                {memberOptions(selected).filter((member) => !selected.members?.some((link) => Number(link.member_id) === Number(member.id))).map((member) => <option value={member.id} key={member.id}>{member.name} · {member.school || '-'}</option>)}
              </select>
            </label>
          </div>
          <div className="admin-member-manage-list">
            <MemberLine role="팀장" member={selected.leader} status="active" />
            {selected.members?.length ? selected.members.map((link) => (
              <MemberLine
                key={link.id}
                role="팀원"
                member={link.member}
                status={link.status || 'active'}
                reason={link.leave_reason}
                action={Number(link.member_id) !== Number(selected.leader_id) && <select disabled={busy} value={link.status || 'active'} onChange={(event) => mutate(() => updateAdminTeamMemberStatus(link.id, event.target.value), '팀원 상태를 변경했습니다.')}>
                  <option value="active">활동</option>
                  <option value="left">탈퇴</option>
                  <option value="removed">제외</option>
                </select>}
              />
            )) : <p>등록된 팀원이 없습니다.</p>}
          </div>
          <p className="admin-flow-note">팀원 추가/삭제성 처리는 team_matching_team_members와 팀 current_members에 바로 반영됩니다.</p>
        </section>

        <section className="admin-matching-box">
          <h3><Trophy /> 결과 등록</h3>
          <p>공모전 종료 후 팀 결과를 등록하고 승인하면 활동날씨 성과 점수에 반영할 수 있습니다.</p>
          <Link className="button primary" to={`/admin/teams/${selected.id}/result`}>결과 등록으로 이동</Link>
        </section>

        <section className="admin-matching-box">
          <h3><MessageSquareText /> 동료평가 승인</h3>
          <p>동료평가는 관리자가 확인/승인한 뒤 활동날씨 계산에 반영하는 흐름으로 관리합니다.</p>
          <Link className="button secondary" to={`/admin/peer-reviews?teamId=${selected.id}`}>동료평가 확인</Link>
        </section>
      </div>
    </Modal>}
  </>
}

function activeMembers(team) {
  return (team.members ?? []).filter((link) => !link.status || link.status === 'active')
}

function memberOptions(team) {
  const rows = team.allMembers?.length ? team.allMembers : [team.leader, ...(team.members ?? []).map((link) => link.member)].filter(Boolean)
  return [...new Map(rows.filter(Boolean).map((member) => [Number(member.id), member])).values()]
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'))
}

function Info({ label, value }) {
  return <div><b>{label}</b><span>{value || '-'}</span></div>
}

function MemberLine({ role, member, status, reason, action }) {
  return <article>
    <span>{role}</span>
    <b>{member?.name || '회원'}</b>
    <small>{member?.school || '-'} · {member?.generation ? `${member.generation}기` : '기수 미정'}</small>
    {action || <em>{statusLabels[status] || status}</em>}
    {reason && <p>{reason}</p>}
  </article>
}
