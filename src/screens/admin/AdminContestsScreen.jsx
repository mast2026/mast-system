import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareText, Pencil, Plus, Power, Trophy } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import AdminTable from '../../components/AdminTable'
import { Field, FormActions } from '../../components/FormControls'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { createContest, getAllContests, setContestActive, updateContest } from '../../services/contestService'
import { formatDate } from '../../utils/display'

const blank = {
  title: '',
  organizer: '',
  prize: '',
  registration_period: '',
  registration_deadline: '',
  category: '',
  description: '',
  link: '',
  max_team_size: 4,
  duplicate_allowed: false,
  has_presentation: false,
  presentation_date: '',
  hackathon_date: '',
  linked_commercialization: false,
  has_certificate: false,
  award_count: '',
  notes: '',
  is_active: true,
}

export default function AdminContestsScreen({ compact = false }) {
  const q = useQuery(getAllContests, [])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const save = async (values) => {
    setBusy(true)
    setNotice('')
    try {
      editing?.id ? await updateContest(editing.id, values) : await createContest(values)
      setEditing(null)
      setNotice('공모전 정보를 저장했습니다.')
      q.retry()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (contest) => {
    setBusy(true)
    setNotice('')
    try {
      await setContestActive(contest.id, !contest.is_active)
      setNotice(contest.is_active ? '회원 화면에서 숨겼습니다.' : '회원 화면에 노출했습니다.')
      q.retry()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openEdit = (contest) => setEditing({
    ...blank,
    ...contest,
    presentation_date: dateInput(contest.presentation_date),
    hackathon_date: dateInput(contest.hackathon_date),
    registration_deadline: dateInput(contest.registration_deadline),
  })

  return <>
    {!compact ? <PageHeader title="공모전 관리" description="공모전 등록, 노출, 결과 발표일, 결과 등록 흐름을 관리합니다." action={<button className="button primary" onClick={() => setEditing({ ...blank })}><Plus/>등록</button>} /> : <section className="admin-section-actions">
      <div>
        <h1>공모전</h1>
        <p>등록된 공모전과 회원 화면 노출 여부를 관리합니다.</p>
      </div>
      <button className="button primary" onClick={() => setEditing({ ...blank })}><Plus/>공모전 등록</button>
    </section>}
    {notice && <div className="form-notice">{notice}</div>}
    {q.loading ? <LoadingState /> : q.error ? <ErrorState error={q.error} retry={q.retry} /> : <AdminTable rows={q.data} searchPlaceholder="공모전, 주최, 분야 검색" getSearchText={(row) => `${row.title} ${row.organizer} ${row.category}`}
      columns={[
        { key: 'title', label: '공모전', render: (row) => <><b>{row.title || '-'}</b><small className="cell-sub">{row.organizer || '주최 미정'}</small></> },
        { key: 'category', label: '분야', render: (row) => row.category || '-' },
        { key: 'schedule', label: '일정', render: (row) => <div className="stacked-cell"><span>마감 {formatDate(row.registration_deadline)}</span><span>발표 {formatDate(row.presentation_date)}</span></div>, renderText: (row) => `${row.registration_deadline} ${row.presentation_date}` },
        { key: 'is_active', label: '노출', render: (row) => <Badge value={deadlinePassed(row.registration_deadline) ? '마감 숨김' : row.is_active ? 'active' : 'inactive'} /> },
        { key: 'flow', label: '완료 후 흐름', render: () => <div className="table-actions"><Link className="table-button" to="/admin/contest?tab=results"><Trophy/>결과/평가</Link><Link className="table-button" to="/admin/contest?tab=applications"><MessageSquareText/>팀매칭</Link></div> },
        { key: 'manage', label: '관리', render: (row) => <div className="table-actions"><button onClick={() => openEdit(row)}><Pencil/>수정</button><button disabled={busy} onClick={() => toggle(row)}><Power/>{row.is_active ? '숨김' : '노출'}</button></div> },
      ]} />}
    {editing && <Modal title={editing.id ? '공모전 수정' : '공모전 등록'} onClose={() => setEditing(null)} wide><ContestForm initial={editing} onSubmit={save} onCancel={() => setEditing(null)} busy={busy}/></Modal>}
  </>
}

function ContestForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(initial)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <div className="form-grid">
      <Field label="공모전명" required><input value={form.title} onChange={(event) => set('title', event.target.value)} required /></Field>
      <Field label="주최/주관 기관" required><input value={form.organizer} onChange={(event) => set('organizer', event.target.value)} required /></Field>
      <Field label="상금"><input value={form.prize || ''} onChange={(event) => set('prize', event.target.value)} /></Field>
      <Field label="모집 분야"><input value={form.category || ''} onChange={(event) => set('category', event.target.value)} /></Field>
      <Field label="접수 기간"><input value={form.registration_period || ''} onChange={(event) => set('registration_period', event.target.value)} placeholder="예: 2026.06.01 ~ 06.30" /></Field>
      <Field label="접수 마감일" required><input type="date" value={form.registration_deadline || ''} onChange={(event) => set('registration_deadline', event.target.value)} required /></Field>
      <Field label="결과 발표일"><input type="date" value={form.presentation_date || ''} onChange={(event) => set('presentation_date', event.target.value)} /></Field>
      <Field label="해커톤 일정"><input type="date" value={form.hackathon_date || ''} onChange={(event) => set('hackathon_date', event.target.value)} /></Field>
      <Field label="최대 팀원 수" required><input type="number" min="1" value={form.max_team_size} onChange={(event) => set('max_team_size', event.target.value)} required /></Field>
      <Field label="시상 수"><input value={form.award_count || ''} onChange={(event) => set('award_count', event.target.value)} placeholder="예: 대상 1팀, 우수상 2팀" /></Field>
    </div>
    <Field label="설명"><textarea value={form.description || ''} onChange={(event) => set('description', event.target.value)} /></Field>
    <Field label="공모전 링크"><input type="url" value={form.link || ''} onChange={(event) => set('link', event.target.value)} /></Field>
    <Field label="추가 정보"><textarea rows="5" value={form.notes || ''} onChange={(event) => set('notes', event.target.value)} placeholder="참가 자격, 평가 기준, 제출 형식, 지식재산권, 수상 후 의무사항 등" /></Field>
    <div className="check-grid">
      <Check label="중복 지원 허용" checked={form.duplicate_allowed} onChange={(value) => set('duplicate_allowed', value)} />
      <Check label="발표 평가 있음" checked={form.has_presentation} onChange={(value) => set('has_presentation', value)} />
      <Check label="연계 사업화 지원" checked={form.linked_commercialization} onChange={(value) => set('linked_commercialization', value)} />
      <Check label="상장 발급" checked={form.has_certificate} onChange={(value) => set('has_certificate', value)} />
      <Check label="회원 화면 노출" checked={form.is_active} onChange={(value) => set('is_active', value)} />
    </div>
    <FormActions submitting={busy} submitLabel="공모전 저장" onCancel={onCancel} />
  </form>
}

function Check({ label, checked, onChange }) {
  return <label className="check-field"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>
}

const dateInput = (value) => value ? String(value).slice(0, 10) : ''

function deadlinePassed(value) {
  if (!value) return false
  const deadline = new Date(`${String(value).slice(0, 10)}T23:59:59`)
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()
}
