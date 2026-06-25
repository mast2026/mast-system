import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Plus } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import AdminTable from '../../components/AdminTable'
import { Field, FormActions } from '../../components/FormControls'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { createAnnouncement, getAdminAnnouncements, updateAnnouncement } from '../../services/adminService'
import { formatDate, titleOf } from '../../utils/display'

export default function AdminAnnouncementsScreen() {
  const q = useQuery(getAdminAnnouncements, [])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const save = async (values) => {
    setBusy(true); setNotice('')
    try {
      const result = editing?.id ? await updateAnnouncement(editing.id, values) : await createAnnouncement(values)
      setEditing(null)
      setNotice(result?.notificationWarning ? `공지는 저장됐지만 전체 알림 연동은 확인이 필요합니다. ${result.notificationWarning}` : '공지 정보를 저장했고 회원 홈/공지/알림에 연동했습니다.')
      q.retry()
    }
    catch (error) { setNotice(`${error.message} · DB 컬럼 확인 필요`) }
    finally { setBusy(false) }
  }
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  return <>
    <PageHeader title="공지 관리" description="회원 화면에 노출할 공지를 관리합니다." action={<div className="page-actions">
      <Link className="button secondary" to="/admin"><Home/>관리자 메인</Link>
      <button className="button primary" onClick={() => setEditing({ title: '', content: '', is_published: true, sync_notification: true })}><Plus/>등록</button>
    </div>} />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={q.data} searchPlaceholder="공지 검색" columns={[
      { key: 'id', label: 'ID' },
      { key: 'title', label: '제목', render: titleOf },
      { key: 'is_published', label: '노출', render: (row) => <Badge value={(row.is_published ?? row.is_active) ? 'active' : 'closed'} /> },
      { key: 'created_at', label: '등록일', render: (row) => formatDate(row.created_at) },
      { key: 'edit', label: '관리', render: (row) => <button className="table-button" onClick={() => setEditing({ title: titleOf(row), content: row.body || row.content || row.message || row.description || '', is_published: row.is_published ?? row.is_active ?? true, sync_notification: false, id: row.id })}>수정</button> },
    ]} />
    {editing && <Modal title={editing.id ? '공지 수정' : '공지 등록'} onClose={() => setEditing(null)} wide><AnnouncementForm initial={editing} onSubmit={save} onCancel={() => setEditing(null)} busy={busy}/></Modal>}
  </>
}

function AnnouncementForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(initial)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <Field label="제목" required><input value={form.title} onChange={(event) => set('title', event.target.value)} required /></Field>
    <Field label="내용" required><textarea value={form.content} onChange={(event) => set('content', event.target.value)} required /></Field>
    <label className="check-field"><input type="checkbox" checked={Boolean(form.is_published)} onChange={(event) => set('is_published', event.target.checked)} /><span>회원 화면 노출</span></label>
    {!form.id && <label className="check-field"><input type="checkbox" checked={form.sync_notification !== false} onChange={(event) => set('sync_notification', event.target.checked)} /><span>전체 알림에도 같이 등록</span></label>}
    <FormActions submitting={busy} submitLabel="공지 저장" onCancel={onCancel}/>
  </form>
}
