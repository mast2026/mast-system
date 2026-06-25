import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Info, LockKeyhole, Pencil, RefreshCw, Trash2, Trophy, UserMinus, UsersRound } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { Field, FormActions, TagSelector } from '../components/FormControls'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { INTEREST_AREAS, PERSONALITY_TAGS, ROLE_TAGS, SKILL_TAGS } from '../constants/tags'
import { decideApplication, getLeaderApplicationsForTeam } from '../services/applicationService'
import { deleteTeamPost, getTeamManagement, removeTeamMember, setRecruitmentStatus, submitTeamMatchingComplete, updateOpenChatUrl, updateTeamPost } from '../services/teamService'
import { safeHttpUrl } from '../utils/display'

export default function TeamManagementScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { member } = useAuth()
  const q = useQuery(async () => {
    const [team, applications] = await Promise.all([
      getTeamManagement(id, member.id),
      getLeaderApplicationsForTeam(id, member.id),
    ])
    return { team, applications }
  }, [id, member.id])
  const [selected, setSelected] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [chat, setChat] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const run = async (action, success) => {
    setBusy(true)
    setNotice('')
    try {
      await action()
      setNotice(success)
      setSelected(null)
      setRemoving(null)
      setRejecting(null)
      setEditing(null)
      setReason('')
      q.retry()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  const removePost = async () => {
    if (!window.confirm('이 팀 공고를 삭제할까요? 지원서와 팀원 연결 정보도 함께 정리됩니다.')) return
    setBusy(true)
    setNotice('')
    try {
      await deleteTeamPost(team.id, member)
      navigate('/my/teams', { replace: true })
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />

  const { team, applications } = q.data
  const members = team.teamMemberships.filter((item) => item.member_id !== team.leader_id)
  const chatValue = chat === null ? (team.open_chat_url || '') : chat
  const correctionEnd = team.closed_at ? getCorrectionEnd(team.closed_at) : null

  return <>
    <PageHeader
      title="팀 관리"
      description={team.contest?.title || '팀 운영과 모집 상태를 관리하세요.'}
      back
      action={<div className="page-actions">
        <button className="button secondary small" disabled={busy} onClick={() => setEditing(teamToForm(team))}><Pencil />공고 수정</button>
        <button className="button danger small" disabled={busy} onClick={removePost}><Trash2 />삭제</button>
        <Link className="button secondary small" to={`/teams/${team.id}/result`}><Trophy />결과 등록</Link>
      </div>}
    />
    {notice && <div className="form-notice">{notice}</div>}

    {!team.capabilities.membershipOperations && <div className="schema-warning"><LockKeyhole /><div><b>DB 컬럼 추가 필요</b><p>team_matching_team_members에 status, left_at, leave_reason, removed_by_member_id 컬럼을 추가하면 팀 나가기·제외 기능이 활성화됩니다.</p></div></div>}
    {!team.capabilities.openChat && <div className="schema-warning"><LockKeyhole /><div><b>DB 컬럼 추가 필요</b><p>team_matching_teams.open_chat_url 컬럼을 추가하면 오픈채팅 관리 기능이 활성화됩니다.</p></div></div>}

    <section className="management-card">
      <div className="management-heading">
        <div>
          <span>팀매칭 상태</span>
          <h2><Badge value={team.status} /> {team.current_members}/{team.required_members}명</h2>
        </div>
        <div className="card-actions">
          {team.status !== 'matched' && team.status !== 'finished' && (
            <button className="button accept" disabled={busy} onClick={() => run(() => submitTeamMatchingComplete(team.id, member.id), '팀매칭 완료가 제출되었습니다. 7일 정정기간 안내가 적용됩니다.')}>
              <CheckCircle2 />팀매칭 완료 제출
            </button>
          )}
          {team.status !== 'recruiting' && team.status !== 'matched' && Number(team.current_members) < Number(team.required_members) && (
            <button className="button accept" disabled={busy} onClick={() => run(() => setRecruitmentStatus(team.id, member.id, 'recruiting'), '모집을 다시 열었습니다.')}>
              <RefreshCw />모집 다시 열기
            </button>
          )}
          {team.status === 'recruiting' && (
            <button className="button secondary" disabled={busy} onClick={() => run(() => setRecruitmentStatus(team.id, member.id, 'closed'), '모집을 마감했습니다.')}>모집 마감</button>
          )}
        </div>
      </div>
      {team.status === 'matched' && <div className="correction-notice">
        <Info />
        <div>
          <b>팀매칭 정정기간 안내</b>
          <p>팀매칭 완료 제출 후 7일 동안 정정기간을 운영합니다. 팀 구성 오류나 탈퇴 사유가 있으면 운영진이 확인할 수 있도록 사유를 남겨주세요.{correctionEnd ? ` 정정기간 종료 예정일은 ${correctionEnd}입니다.` : ''}</p>
        </div>
      </div>}
    </section>

    <section className="management-card">
      <div className="section-heading">
        <h2>오픈채팅방</h2>
        {safeHttpUrl(team.open_chat_url) && <a className="text-link" href={safeHttpUrl(team.open_chat_url)} target="_blank" rel="noreferrer">입장하기 <ExternalLink /></a>}
      </div>
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); run(() => updateOpenChatUrl(team.id, member.id, chatValue), '오픈채팅 링크를 저장했습니다.') }}>
        <input type="url" value={chatValue} onChange={(event) => setChat(event.target.value)} placeholder="https://open.kakao.com/..." disabled={!team.capabilities.openChat} />
        <button className="button primary" disabled={busy || !team.capabilities.openChat}>링크 저장</button>
      </form>
    </section>

    <section className="management-card">
      <div className="section-heading"><h2>현재 팀원</h2><span className="count-pill">{members.length}명</span></div>
      {!members.length ? <EmptyState title="아직 합류한 팀원이 없어요" /> : <div className="member-manage-list">
        {members.map((link) => <div key={link.id}>
          <div className="member-avatar"><UsersRound /></div>
          <div><b>{link.member.name}</b><small>활동 중</small></div>
          <button className="button danger" disabled={busy || !team.capabilities.membershipOperations} onClick={() => setRemoving(link)}><UserMinus />제외</button>
        </div>)}
      </div>}
    </section>

    <section className="management-card">
      <div className="section-heading"><h2>지원자</h2><span className="count-pill">{applications.filter((item) => item.status === 'pending').length}명 대기</span></div>
      {!applications.length ? <EmptyState title="아직 도착한 지원서가 없어요" /> : <div className="applicant-list">
        {applications.map((application) => <article key={application.id}>
          <div className="card-heading">
            <div><h3>{application.applicant?.name || '지원자'}</h3><small>{application.survey_role || tagsToText(application.skill_tags) || '역량 해시태그 미입력'}</small></div>
            <Badge value={application.status} />
          </div>
          <p>{application.capability_appeal || application.survey_purpose || '역량 어필이 비어 있습니다.'}</p>
          <div className="card-actions">
            <button className="button secondary" onClick={() => setSelected(application)}>지원서 보기</button>
            {application.status === 'pending' && <>
              <button className="button accept" disabled={busy} onClick={() => run(() => decideApplication(application.id, member.id, 'accepted'), '지원자를 팀원으로 승인했습니다.')}>승인</button>
              <button className="button danger" disabled={busy} onClick={() => setRejecting(application)}>거절</button>
            </>}
          </div>
        </article>)}
      </div>}
    </section>

    {selected && <Modal title={`${selected.applicant?.name || '지원자'}님의 지원서`} onClose={() => setSelected(null)} wide><ApplicationDetail application={selected} /></Modal>}
    {editing && <TeamPostEditModal
      initial={editing}
      capabilities={team.capabilities}
      busy={busy}
      onClose={() => setEditing(null)}
      onSubmit={(values) => run(() => updateTeamPost(team.id, member.id, values), '팀 공고를 수정했습니다.')}
    />}
    {rejecting && <ReasonModal title="지원 거절 사유" reason={reason} setReason={setReason} busy={busy} onClose={() => setRejecting(null)} onSubmit={() => run(() => decideApplication(rejecting.id, member.id, 'rejected', reason), '지원자를 거절했습니다.')} />}
    {removing && <ReasonModal title={`${removing.member.name}님을 팀에서 제외할까요?`} reason={reason} setReason={setReason} busy={busy} onClose={() => setRemoving(null)} onSubmit={() => run(() => removeTeamMember(team.id, removing.member_id, member.id, reason), '팀원을 제외했습니다.')} />}
  </>
}

function TeamPostEditModal({ initial, capabilities, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(initial)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  return <Modal title="팀 공고 수정" onClose={onClose} wide>
    <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
      <Field label="모집 목표 인원" required>
        <input type="number" min="2" max="99" value={form.required_members} onChange={(event) => set('required_members', event.target.value)} required />
      </Field>
      <Field label="팀 소개 / 함께하면 좋은 점" required>
        <textarea value={form.introduction} onChange={(event) => set('introduction', event.target.value)} required />
      </Field>
      <Field label="상금 배분 방식">
        <input value={form.prize_distribution} onChange={(event) => set('prize_distribution', event.target.value)} />
      </Field>
      <Field label="오픈채팅 URL">
        <input type="url" value={form.open_chat_url} onChange={(event) => set('open_chat_url', event.target.value)} placeholder="https://open.kakao.com/..." disabled={!capabilities.openChat} />
      </Field>
      <TagSelector label="필요한 역할" options={ROLE_TAGS} value={form.needed_roles} onChange={(value) => set('needed_roles', value)} />
      <div className="form-grid">
        <Field label="진행 방식">
          <select value={form.work_style} onChange={(event) => set('work_style', event.target.value)}>
            <option value="">선택하세요</option>
            <option>온라인 중심</option>
            <option>오프라인 중심</option>
            <option>온·오프라인 병행</option>
          </select>
        </Field>
        <Field label="회의 방식">
          <input value={form.meeting_style} onChange={(event) => set('meeting_style', event.target.value)} placeholder="예: 주 2회 저녁 화상회의" />
        </Field>
      </div>
      <TagSelector label="관심 분야" options={INTEREST_AREAS} value={form.interest_areas} onChange={(value) => set('interest_areas', value)} />
      <TagSelector label="원하는 성향" options={PERSONALITY_TAGS} value={form.personality_tags} onChange={(value) => set('personality_tags', value)} max={5} />
      <TagSelector label="원하는 역량" options={SKILL_TAGS} value={form.skill_tags} onChange={(value) => set('skill_tags', value)} max={7} />
      <FormActions submitting={busy} submitLabel="수정 저장" onCancel={onClose} />
    </form>
  </Modal>
}

function teamToForm(team) {
  return {
    required_members: team.required_members || 2,
    introduction: team.introduction || '',
    prize_distribution: team.prize_distribution || '',
    needed_roles: team.needed_roles || [],
    work_style: team.work_style || '',
    meeting_style: team.meeting_style || '',
    open_chat_url: team.open_chat_url || '',
    interest_areas: team.interest_areas || [],
    personality_tags: team.personality_tags || [],
    skill_tags: team.skill_tags || [],
  }
}

function ReasonModal({ title, reason, setReason, busy, onClose, onSubmit }) {
  return <Modal title={title} onClose={onClose}>
    <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
      <Field label="사유" required><textarea value={reason} onChange={(event) => setReason(event.target.value)} required /></Field>
      <FormActions submitting={busy} submitLabel="확인" onCancel={onClose} />
    </form>
  </Modal>
}

function ApplicationDetail({ application }) {
  return <div className="application-detail">
    <Row label="역량 어필" value={application.capability_appeal} />
    <Row label="성향 해시태그" value={tagsToText(application.personality_tags)} />
    <Row label="역량 해시태그" value={tagsToText(application.skill_tags) || application.survey_role} />
    <Row label="참여도 해시태그" value={application.survey_intensity} />
    <Row label="경험 해시태그" value={application.survey_experience} />
    <Row label="환경 해시태그" value={application.availability_note} />
    <Row label="직접 입력 해시태그" value={application.message} />
  </div>
}

function Row({ label, value }) {
  return value ? <div><b>{label}</b><p>{value}</p></div> : null
}

function tagsToText(value) {
  if (!Array.isArray(value)) return value || ''
  return value.map((tag) => `#${tag}`).join(' ')
}

function getCorrectionEnd(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + 7)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
