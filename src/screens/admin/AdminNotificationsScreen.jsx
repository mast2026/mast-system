import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import AdminTable from '../../components/AdminTable'
import { Field, FormActions } from '../../components/FormControls'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { createNotification, getAdminNotifications, getAdminMembers } from '../../services/adminService'
import { formatDate, titleOf } from '../../utils/display'

export default function AdminNotificationsScreen() {
  const q = useQuery(async () => ({ notifications: await getAdminNotifications(), members: await getAdminMembers() }), [])
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const save = async (values) => {
    setBusy(true); setNotice('')
    try { await createNotification(values); setCreating(false); setNotice('알림을 등록했습니다.'); q.retry() }
    catch (error) { setNotice(`${error.message} · DB 컬럼 확인 필요`) }
    finally { setBusy(false) }
  }
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const byId = new Map(q.data.members.map((member) => [member.id, member]))
  return <>
    <PageHeader title="알림 관리" description="특정 회원 또는 전체 회원 대상 알림을 등록합니다." action={<button className="button primary" onClick={() => setCreating(true)}><Plus/>등록</button>} />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={q.data.notifications} searchPlaceholder="알림 검색" columns={[
      { key: 'id', label: 'ID' },
      { key: 'target', label: '대상', render: (row) => row.member_id ? (byId.get(row.member_id)?.name || `회원 ${row.member_id}`) : '전체' },
      { key: 'title', label: '제목', render: titleOf },
      { key: 'message', label: '내용', render: (row) => row.body || '-' },
      { key: 'created_at', label: '등록일', render: (row) => formatDate(row.created_at) },
    ]} />
    {creating && <Modal title="알림 등록" onClose={() => setCreating(false)} wide><NotificationForm members={q.data.members} onSubmit={save} onCancel={() => setCreating(false)} busy={busy}/></Modal>}
  </>
}

function NotificationForm({ members, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState({ member_id: '', type: 'notice', title: '', content: '', href: '' })
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <Field label="대상"><select value={form.member_id} onChange={(event) => set('member_id', event.target.value)}><option value="">전체 회원</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
    <Field label="알림 유형"><select value={form.type} onChange={(event) => set('type', event.target.value)}><option value="notice">일반 공지</option><option value="application_result">지원 결과</option><option value="application_pending">지원서 도착</option><option value="leader_application_result">팀장 신청 결과</option></select></Field>
    <Field label="제목" required><input value={form.title} onChange={(event) => set('title', event.target.value)} required /></Field>
    <Field label="내용" required><textarea value={form.content} onChange={(event) => set('content', event.target.value)} required /></Field>
    <Field label="이동 경로"><input value={form.href} onChange={(event) => set('href', event.target.value)} placeholder="예: /my/applications" /></Field>
    <FormActions submitting={busy} submitLabel="알림 등록" onCancel={onCancel}/>
  </form>
}
