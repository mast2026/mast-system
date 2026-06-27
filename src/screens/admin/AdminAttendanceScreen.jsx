import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, Home, KeyRound, Plus, Trash2, UserCheck, UserX } from 'lucide-react'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/FormControls'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { attendanceStatusLabel } from '../../services/attendanceService'
import { notifyAttendanceOpen } from '../../services/notificationService'
import {
  clearAttendanceCode,
  createAttendanceSession,
  deleteAttendanceSession,
  getAdminAttendanceOverview,
  setAttendanceRecordStatus,
  updateAttendanceSession,
} from '../../services/adminService'

const tabs = [
  ['sessions', CalendarDays, '모임 관리'],
  ['code', KeyRound, '출석코드'],
  ['records', UserCheck, '출석 현황'],
  ['history', ClipboardList, '일정 내역'],
]

export default function AdminAttendanceScreen() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'sessions'
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [codeEditing, setCodeEditing] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const q = useQuery(getAdminAttendanceOverview, [])

  const setTab = (next) => setParams({ tab: next })

  const data = q.data ?? { sessions: [], records: [], members: [], warnings: [] }
  const sessions = useMemo(() => sortSessions(data.sessions), [data.sessions])
  const upcoming = sessions.filter((session) => !isPastSession(session)).slice(0, 4)
  const recent = sessions.filter((session) => isPastSession(session)).slice(0, 4)
  const activeSession = sessions.find((session) => String(session.id) === String(selectedSessionId)) || sessions[0]
  const codeSession = codeEditing || activeSession

  const saveSession = async (values) => {
    setBusy(true)
    setNotice('')
    try {
      await createAttendanceSession(values)
      setCreating(false)
      let extra = ''
      if (values.status === 'open') {
        try { await notifyAttendanceOpen({ title: values.title }); extra = ' 전체 회원에게 출석 알림을 보냈어요.' }
        catch { extra = ' (출석 알림 발송은 실패했어요.)' }
      }
      setNotice(`모임 일정을 등록했습니다.${extra}`)
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  const updateSession = async (values) => {
    setBusy(true)
    setNotice('')
    try {
      const wasOpen = String(editing.status) === 'open'
      await updateAttendanceSession(editing.id, values)
      setEditing(null)
      let extra = ''
      if (values.status === 'open' && !wasOpen) {
        try { await notifyAttendanceOpen({ title: values.title }); extra = ' 전체 회원에게 출석 알림을 보냈어요.' }
        catch { extra = ' (출석 알림 발송은 실패했어요.)' }
      }
      setNotice(`모임 일정을 수정했습니다.${extra}`)
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  const removeSession = async (session) => {
    if (!window.confirm(`"${session.title || '모임'}" 일정을 삭제할까요? 관련 출석 기록도 함께 삭제됩니다.`)) return
    setBusy(true)
    setNotice('')
    try {
      await deleteAttendanceSession(session.id)
      setNotice('모임 일정을 삭제했습니다.')
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  const saveCode = async (values) => {
    setBusy(true)
    setNotice('')
    try {
      await updateAttendanceSession(codeEditing.id, { ...codeEditing, ...values })
      setCodeEditing(null)
      setNotice('출석코드를 변경했습니다.')
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  const removeCode = async (session) => {
    if (!session?.id) return
    setBusy(true)
    setNotice('')
    try {
      await clearAttendanceCode(session.id)
      setNotice('출석코드를 삭제했습니다.')
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  const markAttendance = async (member, status) => {
    if (!activeSession?.id) return
    setBusy(true)
    setNotice('')
    try {
      await setAttendanceRecordStatus({
        sessionId: activeSession.id,
        memberId: member.id,
        status,
        points: activeSession.base_points ?? 1,
      })
      setNotice(`${member.name}님을 ${attendanceStatusLabel(status)} 처리했습니다.`)
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (q.loading) return <LoadingState label="출석 관리자 데이터를 불러오는 중" />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />

  return <div className="admin-attendance-page">
    {notice && <div className="form-notice">{notice}</div>}
    {!!data.warnings.length && <div className="admin-soft-warning">
      일부 출석 DB 권한 확인이 필요합니다. {data.warnings.join(' / ')}
    </div>}

    <nav className="admin-inner-tabs admin-management-tabs admin-attendance-tabs" aria-label="출석 관리 메뉴">
      <Link className="admin-icon-button mini" to="/admin" aria-label="관리자 메인"><Home /></Link>
      {tabs.map(([key, Icon, label]) => (
        <button key={key} className={tab === key ? 'active' : ''} type="button" onClick={() => setTab(key)}>
          <Icon /><span>{label}</span>
        </button>
      ))}
    </nav>

    {tab === 'sessions' && <>
      <section className="admin-attendance-hero">
        <div>
          <span>MAST ATTENDANCE</span>
          <h1>출석 관리</h1>
          <p>모임 일정과 출석 체크 상태를 한 곳에서 관리해요.</p>
          <button type="button" onClick={() => setCreating(true)}><Plus /> 일정 생성</button>
        </div>
        <CalendarClock />
      </section>

      <section className="attendance-two-column">
        <AttendanceListBlock title="예정 모임" sessions={upcoming} empty="예정된 모임이 없습니다." onEdit={setEditing} onDelete={removeSession} />
        <AttendanceListBlock title="최근 모임" sessions={recent} empty="최근 종료된 모임이 없습니다." onEdit={setEditing} onDelete={removeSession} />
      </section>
    </>}

    {tab === 'code' && <>
      <section className="attendance-code-current">
        <div>
          <span>현재 선택 모임</span>
          <h2>{codeSession?.title || '등록된 모임 없음'}</h2>
          <p>{formatSessionDate(codeSession)} · {codeSession?.location || '장소 미정'}</p>
        </div>
        <div className="attendance-code-box">
          <small>출석코드</small>
          <b>{codeSession?.attendance_code || '미등록'}</b>
          <span>{codeSession?.attendance_code_enabled === false ? '사용 안 함' : '사용 중'}</span>
        </div>
        <div className="attendance-code-actions">
          <button type="button" disabled={!codeSession} onClick={() => setCodeEditing(codeSession)}>변경</button>
          <button type="button" disabled={!codeSession} onClick={() => removeCode(codeSession)}>삭제</button>
        </div>
      </section>
      <section className="admin-list-panel">
        <header><h2>모임 선택</h2></header>
        <div className="admin-session-list compact">
          {sessions.map((session) => <SessionCard key={session.id} session={session} onEdit={() => setCodeEditing(session)} onDelete={removeSession} actionLabel="코드 변경" />)}
        </div>
      </section>
    </>}

    {tab === 'records' && <AttendanceRecordsPanel
      sessions={sessions}
      records={data.records}
      members={data.members}
      activeSession={activeSession}
      selectedSessionId={selectedSessionId}
      onSelectSession={setSelectedSessionId}
      onMark={markAttendance}
      busy={busy}
    />}

    {tab === 'history' && <section className="admin-list-panel">
      <header><h2>일정 내역</h2><button type="button" onClick={() => setCreating(true)} aria-label="일정 추가"><Plus /></button></header>
      <div className="admin-session-list">
        {sessions.length ? sessions.map((session) => <SessionCard key={session.id} session={session} onEdit={setEditing} onDelete={removeSession} />) : <div className="admin-empty-card">등록된 일정 내역이 없습니다.</div>}
      </div>
    </section>}

    {creating && <Modal title="출석 모임 등록" onClose={() => setCreating(false)} wide>
      <AttendanceSessionForm onSubmit={saveSession} onCancel={() => setCreating(false)} busy={busy} />
    </Modal>}
    {editing && <Modal title="출석 모임 수정" onClose={() => setEditing(null)} wide>
      <AttendanceSessionForm initial={editing} onSubmit={updateSession} onCancel={() => setEditing(null)} busy={busy} />
    </Modal>}
    {codeEditing && <Modal title="출석코드 변경" onClose={() => setCodeEditing(null)}>
      <AttendanceCodeForm initial={codeEditing} onSubmit={saveCode} onCancel={() => setCodeEditing(null)} busy={busy} />
    </Modal>}
  </div>
}

function AttendanceListBlock({ title, sessions, empty, onEdit, onDelete }) {
  return <section className="admin-list-panel">
    <header><h2>{title}</h2></header>
    <div className="admin-session-list">
      {sessions.length ? sessions.map((session) => <SessionCard key={session.id} session={session} onEdit={onEdit} onDelete={onDelete} />) : <div className="admin-empty-card">{empty}</div>}
    </div>
  </section>
}

function AttendanceRecordsPanel({ sessions, records, members, activeSession, selectedSessionId, onSelectSession, onMark, busy }) {
  const selectedId = selectedSessionId || activeSession?.id || ''
  const sessionRecords = records.filter((record) => String(record.session_id) === String(selectedId))
  const recordMap = new Map(sessionRecords.map((record) => [String(record.member_id), record]))
  const presentMembers = members.filter((member) => ['present', 'late', 'excused'].includes(recordMap.get(String(member.id))?.status))
  const absentMembers = members.filter((member) => !['present', 'late', 'excused'].includes(recordMap.get(String(member.id))?.status))

  return <section className="attendance-record-panel">
    <div className="mast-section-heading">
      <div>
        <h2>출석 현황</h2>
        <p>모임을 선택한 뒤 회원별 출석/결석을 처리합니다.</p>
      </div>
      <select value={selectedId} onChange={(event) => onSelectSession(event.target.value)}>
        {sessions.map((session) => <option value={session.id} key={session.id}>{session.title || '모임'} · {formatSessionDate(session)}</option>)}
      </select>
    </div>
    {!sessions.length ? <EmptyState title="모임이 없습니다" description="일정을 먼저 등록해 주세요." /> : (
      <div className="attendance-roster-grid">
        <RosterColumn title={`출석한 회원 ${presentMembers.length}명`} members={presentMembers} recordMap={recordMap} onMark={onMark} busy={busy} />
        <RosterColumn title={`결석/미처리 회원 ${absentMembers.length}명`} members={absentMembers} recordMap={recordMap} onMark={onMark} busy={busy} />
      </div>
    )}
  </section>
}

function RosterColumn({ title, members, recordMap, onMark, busy }) {
  return <article className="attendance-roster-column">
    <h3>{title}</h3>
    {!members.length ? <div className="admin-empty-card">해당 회원이 없습니다.</div> : members.map((member) => {
      const record = recordMap.get(String(member.id))
      const status = record?.status || 'absent'
      const lateNote = status === 'late' ? (Number(record?.points) <= -3 ? ' · 30분 초과(-3)' : ' · 30분 이내(-1)') : ''
      return <div className="attendance-roster-row" key={member.id}>
        <div>
          <b>{member.name}</b>
          <span>{member.gi || member.generation || '-'} · {member.school || '-'}</span>
          {record?.checked_at && <small className="attendance-check-time">체크 {fmtCheckTime(record.checked_at)}{lateNote}</small>}
        </div>
        <Badge value={attendanceStatusLabel(status)} />
        <div>
          <button type="button" disabled={busy} onClick={() => onMark(member, 'present')}><CheckCircle2 />출석</button>
          <button type="button" disabled={busy} onClick={() => onMark(member, 'absent')}><UserX />결석</button>
        </div>
      </div>
    })}
  </article>
}

function SessionCard({ session, onEdit, onDelete, actionLabel = '수정' }) {
  const date = session.starts_at ? new Date(session.starts_at) : null
  const status = session.status || 'scheduled'
  return <article className="admin-session-card">
    <div className="admin-session-date"><b>{isToday(date) ? '오늘' : shortDate(date)}</b><span>{timeOnly(date)}</span></div>
    <div className="admin-session-main">
      <b>{session.title || '모임'}</b>
      <small>📍 {session.location || '장소 미정'}</small>
      <small>{session.attendance_code ? `코드 ${session.attendance_code}` : '출석코드 미등록'}</small>
    </div>
    <div className="admin-session-actions">
      <Badge value={attendanceStatusLabel(status)} />
      <button type="button" onClick={() => onEdit(session)}>{actionLabel}</button>
      <button type="button" className="danger" onClick={() => onDelete(session)}><Trash2 /></button>
    </div>
    <ArrowRight />
  </article>
}

function AttendanceCodeForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState({
    attendance_code_enabled: initial?.attendance_code_enabled !== false,
    attendance_code: initial?.attendance_code || '',
    attendance_open_at: toLocalInput(initial?.attendance_open_at),
    attendance_close_at: toLocalInput(initial?.attendance_close_at),
  })
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <Field label="출석코드"><input value={form.attendance_code} onChange={(event) => set('attendance_code', event.target.value)} placeholder="예: MAST24" /></Field>
    <Field label="코드 오픈"><input type="datetime-local" value={form.attendance_open_at} onChange={(event) => set('attendance_open_at', event.target.value)} /></Field>
    <Field label="코드 마감"><input type="datetime-local" value={form.attendance_close_at} onChange={(event) => set('attendance_close_at', event.target.value)} /></Field>
    <label className="check-field"><input type="checkbox" checked={form.attendance_code_enabled} onChange={(event) => set('attendance_code_enabled', event.target.checked)} /><span>출석코드 사용</span></label>
    <FormActions submitting={busy} submitLabel="코드 저장" onCancel={onCancel} />
  </form>
}

function AttendanceSessionForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    location: initial?.location || '',
    starts_at: toLocalInput(initial?.starts_at),
    ends_at: toLocalInput(initial?.ends_at),
    ontime_at: toLocalInput(initial?.ontime_at),
    status: initial?.status || 'scheduled',
    attendance_code_enabled: initial?.attendance_code_enabled !== false,
    attendance_code: initial?.attendance_code || '',
    attendance_open_at: toLocalInput(initial?.attendance_open_at),
    attendance_close_at: toLocalInput(initial?.attendance_close_at),
    session_mode: initial?.session_mode || 'offline',
    is_orientation: initial?.is_orientation || false,
    target_generations: initial?.target_generations || '',
  }))
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <div className="form-grid">
      <Field label="모임명" required><input value={form.title} onChange={(event) => set('title', event.target.value)} required placeholder="예: MAST 정기모임" /></Field>
      <Field label="장소"><input value={form.location} onChange={(event) => set('location', event.target.value)} placeholder="예: 중앙대학교 310관" /></Field>
      <Field label="시작 일시" required><input type="datetime-local" value={form.starts_at} onChange={(event) => set('starts_at', event.target.value)} required /></Field>
      <Field label="종료 일시"><input type="datetime-local" value={form.ends_at} onChange={(event) => set('ends_at', event.target.value)} /></Field>
      <Field label="출석 정시 마감 (이후 지각·비우면 시작 일시 기준)"><input type="datetime-local" value={form.ontime_at} onChange={(event) => set('ontime_at', event.target.value)} /></Field>
      <Field label="상태"><select value={form.status} onChange={(event) => set('status', event.target.value)}><option value="scheduled">예정</option><option value="open">출석 가능</option><option value="closed">마감</option></select></Field>
      <Field label="모임 유형"><select value={form.session_mode} onChange={(event) => set('session_mode', event.target.value)}><option value="offline">오프라인</option><option value="online">온라인</option></select></Field>
      <Field label="출석코드"><input value={form.attendance_code} onChange={(event) => set('attendance_code', event.target.value)} placeholder="비워두면 나중에 입력" /></Field>
      <Field label="코드 오픈"><input type="datetime-local" value={form.attendance_open_at} onChange={(event) => set('attendance_open_at', event.target.value)} /></Field>
      <Field label="코드 마감"><input type="datetime-local" value={form.attendance_close_at} onChange={(event) => set('attendance_close_at', event.target.value)} /></Field>
    </div>
    <label className="check-field"><input type="checkbox" checked={form.attendance_code_enabled} onChange={(event) => set('attendance_code_enabled', event.target.checked)} /><span>출석코드 사용</span></label>
    <label className="check-field"><input type="checkbox" checked={form.is_orientation} onChange={(event) => set('is_orientation', event.target.checked)} /><span>OT(오리엔테이션) 모임</span></label>
    {form.is_orientation && <Field label="OT 대상 기수 (쉼표로, 예: 1,2 → 2기 OT지만 1기도 필참)">
      <input value={form.target_generations} onChange={(event) => set('target_generations', event.target.value)} placeholder="예: 2 또는 1,2" />
    </Field>}
    <FormActions submitting={busy} submitLabel={initial?.id ? '모임 수정' : '모임 등록'} onCancel={onCancel} />
  </form>
}

function sortSessions(rows = []) {
  return [...rows].sort((a, b) => new Date(b.starts_at ?? b.created_at ?? 0).getTime() - new Date(a.starts_at ?? a.created_at ?? 0).getTime())
}
function isPastSession(session) {
  const base = session.ends_at || session.starts_at
  if (!base) return false
  return new Date(base).getTime() < Date.now() || ['closed', 'finished', 'completed'].includes(String(session.status))
}
function isToday(date) {
  if (!date) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}
function shortDate(date) {
  if (!date || Number.isNaN(date.getTime())) return '일정'
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' }).replace(/\./g, '.').trim()
}
function timeOnly(date) {
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtCheckTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${isToday(d) ? '오늘' : shortDate(d)} ${timeOnly(d)}`
}
function formatSessionDate(session) {
  if (!session?.starts_at) return '일정 미정'
  const date = new Date(session.starts_at)
  return `${shortDate(date)} ${timeOnly(date)}`
}
function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}
