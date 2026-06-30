import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Plus } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import AdminTable from '../../components/AdminTable'
import { Field, FormActions } from '../../components/FormControls'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { useAuth } from '../../context/AuthContext'
import { createAward, deleteAward, getAdminAwards, getAdminTeams, updateAward } from '../../services/adminService'
import { formatDate } from '../../utils/display'

export default function AdminAwardsScreen() {
  const { isFullAdmin } = useAuth()
  const q = useQuery(async () => ({ awards: await getAdminAwards(), teams: await getAdminTeams() }), [])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const save = async (values) => {
    setBusy(true); setNotice('')
    try { editing?.id ? await updateAward(editing.id, values) : await createAward(values); setEditing(null); setNotice('수상 정보를 저장했습니다.'); q.retry() }
    catch (error) { setNotice(`${error.message} · DB 컬럼 확인 필요`) }
    finally { setBusy(false) }
  }
  const remove = async (award) => {
    if (!window.confirm('등록된 결과를 삭제할까요?')) return
    setBusy(true); setNotice('')
    try { await deleteAward(award.id); setNotice('결과를 삭제했습니다.'); q.retry() }
    catch (error) { setNotice(error.message) }
    finally { setBusy(false) }
  }
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const mainHref = isFullAdmin ? '/admin' : '/'
  const mainLabel = isFullAdmin ? '관리자 메인' : '회원 메인'
  return <>
    <div style={{ marginBottom: 12 }}>
      <Link to={mainHref} className="button secondary small"><Home size={16} /> {mainLabel}</Link>
    </div>
    <PageHeader title="수상 관리" description="팀별 공모전 수상 결과를 등록하고 활동날씨 성과 점수에 반영합니다." action={<button className="button primary" onClick={() => setEditing({ team_id: '', contest_id: '', award_result: '' })}><Plus/>등록</button>} />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={q.data.awards} searchPlaceholder="수상 결과, 팀, 공모전 검색" getSearchText={(row) => `${row.award_result} ${row.team?.introduction} ${row.team?.leader?.name} ${row.contest?.title}`}
      columns={[
        { key: 'contest', label: '공모전', render: (row) => row.contest?.title || '-' },
        { key: 'team', label: '팀', render: (row) => teamLabel(row.team) },
        { key: 'award_result', label: '수상 결과', render: (row) => row.award_result || '-' },
        { key: 'created_at', label: '등록일', render: (row) => formatDate(row.created_at) },
        { key: 'edit', label: '관리', render: (row) => <div className="table-actions"><button className="table-button" onClick={() => setEditing(row)}>수정</button><button className="table-button danger" disabled={busy} onClick={() => remove(row)}>삭제</button></div> },
      ]} />
    {editing && <Modal title={editing.id ? '수상 수정' : '수상 등록'} onClose={() => setEditing(null)} wide><AwardForm initial={editing} teams={q.data.teams} onSubmit={save} onCancel={() => setEditing(null)} busy={busy}/></Modal>}
  </>
}

function AwardForm({ initial, teams, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(initial)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const contests = uniqueContests(teams)
  const filteredTeams = form.contest_id ? teams.filter((team) => String(team.contest_id) === String(form.contest_id)) : teams
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <div className="form-grid">
      <Field label="공모전" required>
        <select value={form.contest_id || ''} onChange={(event) => setForm((prev) => ({ ...prev, contest_id: event.target.value, team_id: '' }))} required>
          <option value="">공모전을 선택하세요</option>
          {contests.map((contest) => <option key={contest.id} value={contest.id}>{contest.title || `공모전 ${contest.id}`}</option>)}
        </select>
      </Field>
      <Field label="팀" required>
        <select value={form.team_id || ''} onChange={(event) => { const team = teams.find((item) => String(item.id) === event.target.value); setForm((prev) => ({ ...prev, team_id: event.target.value, contest_id: team?.contest_id || prev.contest_id })) }} required>
          <option value="">팀을 선택하세요</option>
          {filteredTeams.map((team) => <option key={team.id} value={team.id}>{teamLabel(team)}</option>)}
        </select>
      </Field>
    </div>
    <Field label="수상 결과" required><textarea value={form.award_result || ''} onChange={(event) => set('award_result', event.target.value)} required placeholder="예: 대상 / 부산광역시장상 / 300만원" /></Field>
    <FormActions submitting={busy} submitLabel="수상 저장" onCancel={onCancel}/>
  </form>
}

function uniqueContests(teams = []) {
  const map = new Map()
  teams.forEach((team) => {
    if (team.contest_id && !map.has(team.contest_id)) map.set(team.contest_id, team.contest || { id: team.contest_id, title: `공모전 ${team.contest_id}` })
  })
  return [...map.values()]
}

function teamLabel(team) {
  if (!team) return '팀 공고'
  return [team.contest?.title, team.leader?.name ? `${team.leader.name} 팀` : null, team.introduction].filter(Boolean).join(' · ') || `팀 ${team.id}`
}
