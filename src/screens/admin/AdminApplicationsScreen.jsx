import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, MessageSquareText, Trophy, UsersRound } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import AdminTable from '../../components/AdminTable'
import Modal from '../../components/Modal'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { useAuth } from '../../context/AuthContext'
import {
  addAdminTeamMember,
  getAdminApplications,
  getAdminTeams,
  updateAdminTeamLeader,
  updateAdminTeamMemberStatus,
  updateAdminTeamStatus,
} from '../../services/adminService'

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
  const { isFullAdmin } = useAuth()
  const teamsQ = useQuery(getAdminTeams, [])
  const applicationsQ = useQuery(getAdminApplications, [])
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const mutate = async (action, message) => {
    setBusy(true)
    setNotice('')
    try {
      const result = await action()
      setNotice(message)
      if (result?.id) {
        setSelected((current) => Number(current?.id) === Number(result.id) ? { ...current, ...result } : current)
      }
      teamsQ.retry()
      applicationsQ.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  if ((teamsQ.loading && !teamsQ.data) || (applicationsQ.loading && !applicationsQ.data)) return <LoadingState />
  if ((teamsQ.error && !teamsQ.data) || (applicationsQ.error && !applicationsQ.data)) return <ErrorState error={teamsQ.error || applicationsQ.error} retry={() => { teamsQ.retry(); applicationsQ.retry() }} />

  const applications = applicationsQ.data ?? []
  const teamById = new Map((teamsQ.data ?? []).map((team) => [Number(team.id), team]))
  const applicationGroups = groupApplicationsByTeam(applications, teamById)
    .sort((a, b) => Number(isAdminApprovalNeededGroup(b)) - Number(isAdminApprovalNeededGroup(a)) || Number(b.acceptedCount) - Number(a.acceptedCount) || Number(b.applications[0]?.id ?? 0) - Number(a.applications[0]?.id ?? 0))
  const approvalNeededGroups = applicationGroups.filter(isAdminApprovalNeededGroup)
  const matchedTeams = (teamsQ.data ?? []).filter(isAdminApprovedTeam)
  const mainHref = isFullAdmin ? '/admin' : '/'
  const mainLabel = isFullAdmin ? '관리자 메인' : '회원 메인'

  return <>
    <PageHeader
      title="팀매칭 관리"
      description="팀장 검토가 끝난 최종 팀원 구성을 경영전략팀이 승인하면 매칭이 완료됩니다. 관리자 메인에는 승인 대기팀만 집계됩니다."
      action={<Link to={mainHref} className="button secondary small"><Home size={16} /> {mainLabel}</Link>}
    />
    {notice && <div className="form-notice">{notice}</div>}

    <section className="admin-table-block">
      <div className="admin-table-heading">
        <div>
          <h2>관리자 승인 대기팀</h2>
          <p>승인 필요 {approvalNeededGroups.length}팀</p>
        </div>
      </div>
      <AdminTable
        rows={applicationGroups}
        searchPlaceholder="지원자, 공모전, 팀장, 상태 검색"
        getSearchText={(row) => `${row.applicantsText} ${row.contest?.title} ${row.team?.leader?.name} ${row.team?.introduction} ${row.team?.status}`}
        filters={[
          { key: 'approval', label: '처리', value: (row) => isAdminApprovalNeededGroup(row) ? 'required' : adminMatchingState(row), options: [{ value: 'required', label: '관리자 승인 필요' }, { value: 'leader_reviewing', label: '팀장 검토중' }, { value: 'recruiting_only', label: '모집 중' }, { value: 'matched', label: '매칭 완료' }] },
        ]}
        columns={[
          { key: 'contest', label: '공모전', render: (row) => <StackedCell title={row.contest?.title || '-'} detail={row.team?.leader?.name ? `팀장 ${row.team.leader.name}` : '팀장 정보 없음'} /> },
          { key: 'applicants', label: '지원 현황', render: (row) => <StackedCell title={`팀장 선정 ${row.acceptedCount}명 / 검토 중 ${row.pendingCount}명`} detail={row.applicantsText || '-'} /> },
          { key: 'finalMembers', label: '현재 인원', render: (row) => <StackedCell title={`${teamTotalMembers(row.team).length}/${row.team?.required_members ?? '-'}`} detail={teamTotalMembers(row.team).map((member) => member.name).filter(Boolean).join(', ') || '팀장만 등록'} /> },
          { key: 'approvalState', label: '관리자 처리', render: (row) => <Badge value={adminMatchingState(row)} /> },
          { key: 'teamStatus', label: '팀 상태', render: (row) => row.team?.id ? <select className="table-select" disabled={busy} value={teamStatusValue(row.team)} onChange={(event) => mutate(() => updateAdminTeamStatus(row.team.id, event.target.value), '팀 상태를 변경했습니다.')}>
            <option value="recruiting">모집 중</option>
            <option value="matched">팀 확정</option>
          </select> : '-' },
          { key: 'manage', label: '팀 승인', render: (row) => <div className="table-actions">
            {isAdminApprovalNeededGroup(row) && <button className="table-button" disabled={busy} onClick={() => mutate(() => updateAdminTeamStatus(row.team.id, 'matched'), '매칭을 최종 승인했습니다.')}>최종 승인</button>}
            <button className="table-button" type="button" onClick={() => setSelected(teamById.get(Number(row.team?.id)) || row.team)}>팀 확인</button>
          </div> },
        ]}
      />
    </section>

    <section className="admin-table-block">
      <div className="admin-table-heading">
        <div>
          <h2>확정팀 관리</h2>
          <p>팀 확정 이후 팀원 구성, 결과 등록, 동료평가 흐름을 관리합니다.</p>
        </div>
      </div>
    <AdminTable
      rows={matchedTeams}
      searchPlaceholder="공모전, 팀장, 팀원, 팀 소개 검색"
      getSearchText={(row) => `${row.contest?.title} ${row.leader?.name} ${row.members?.map((item) => item.member?.name).join(' ')} ${row.introduction} ${row.status}`}
      columns={[
        { key: 'contest', label: '공모전', render: (row) => row.contest?.title || '-' },
        { key: 'leader', label: '팀장', render: (row) => row.leader?.name || '-' },
        { key: 'members', label: '전체 인원', render: (row) => `${teamTotalMembers(row).length}/${row.required_members ?? '-'}` },
        { key: 'status', label: '상태', render: (row) => <Badge value={statusLabels[row.status] || row.status || '팀 확정'} /> },
        { key: 'open_chat_url', label: '오픈채팅', render: (row) => row.hasOpenChat ? '등록' : '미등록' },
        { key: 'manage', label: '관리', render: (row) => <div className="table-actions"><button className="table-button" onClick={() => setSelected(row)}>팀 확인</button><Link className="table-button" to={`/admin/teams/${row.id}/result`}>결과</Link><Link className="table-button" to={`/admin/peer-reviews?teamId=${row.id}`}>평가</Link></div> },
      ]}
    />
    </section>

    {selected && <Modal title="팀매칭 상세" onClose={() => setSelected(null)} wide>
      <div className="admin-matching-detail">
        <section className="admin-detail-grid">
          <Info label="공모전" value={selected.contest?.title} />
          <Info label="팀장" value={selected.leader?.name} />
          <Info label="상태" value={statusLabels[selected.status] || selected.status} />
          <Info label="오픈채팅" value={selected.hasOpenChat ? '등록됨' : '미등록'} />
        </section>

        <section className="admin-matching-box">
          <h3>팀 상태</h3>
          <div className="admin-team-edit-controls">
            <label>
              <span>상태 수정</span>
              <select disabled={busy} value={selected.status === 'recruiting' ? 'recruiting' : 'matched'} onChange={(event) => mutate(() => updateAdminTeamStatus(selected.id, event.target.value), '팀 상태를 변경했습니다.')}>
                <option value="recruiting">모집 중</option>
                <option value="matched">팀 확정</option>
              </select>
            </label>
          </div>
          <p className="admin-flow-note">팀 확정 상태는 관리자 메인의 팀매칭 신청 카운트에서 제외됩니다.</p>
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

function groupApplicationsByTeam(applications, teamById = new Map()) {
  const groups = new Map()
  applications.forEach((application) => {
    const teamId = Number(application.team_id)
    const fullTeam = teamById.get(teamId)
    if (!groups.has(teamId)) {
      groups.set(teamId, {
        id: `team-${teamId}`,
        team: fullTeam || application.team,
        contest: application.contest,
        applications: [],
        pendingCount: 0,
        acceptedCount: 0,
        applicantsText: '',
      })
    }
    const group = groups.get(teamId)
    group.applications.push(application)
    if (String(application.status || 'pending') === 'pending') group.pendingCount += 1
    if (String(application.status || '') === 'accepted') group.acceptedCount += 1
  })
  return [...groups.values()].map((group) => ({
    ...group,
    applicantsText: group.applications
      .map((application) => application.applicant?.name)
      .filter(Boolean)
      .join(', '),
  }))
}

function isAdminApprovalNeededGroup(group) {
  return group.acceptedCount > 0 && !isAdminApprovedTeam(group.team)
}

function teamTotalMembers(team) {
  const members = []
  if (team?.leader) members.push(team.leader)
  ;(team?.members ?? []).forEach((link) => {
    if ((!link.status || link.status === 'active') && link.member && Number(link.member_id) !== Number(team?.leader_id)) {
      members.push(link.member)
    }
  })
  return members
}

function adminMatchingState(group) {
  if (isAdminApprovalNeededGroup(group)) return 'admin_approval_requested'
  if (group.pendingCount > 0 && !isAdminApprovedTeam(group.team)) return 'leader_reviewing'
  if (teamStatusValue(group.team) === 'recruiting') return 'recruiting_only'
  return 'matched'
}

function teamStatusValue(team) {
  return isAdminApprovedTeam(team) ? 'matched' : 'recruiting'
}

function isAdminApprovedTeam(team) {
  return ['matched', 'finished'].includes(String(team?.status || '').trim())
}

function StackedCell({ title, detail }) {
  return <span className="stacked-cell"><span>{title}</span><small>{detail}</small></span>
}

function activeMembers(team) {
  return teamTotalMembers(team)
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
    <div className="admin-member-line-info">
      <b>{member?.name || '회원'}</b>
      <small>{member?.school || '-'} · {member?.generation ? `${member.generation}기` : '기수 미정'}</small>
    </div>
    {action || <em>{statusLabels[status] || status}</em>}
    {reason && <p>{reason}</p>}
  </article>
}
