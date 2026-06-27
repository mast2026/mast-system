import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, LockKeyhole, UsersRound } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { attendanceStatusLabel, effectiveSessionStatus, getAttendanceDashboard, isAttendableNow, submitAttendance } from '../services/attendanceService'

const memberTabs = [
  ['home', '홈'],
  ['sessions', '모임 목록'],
  ['check', '출석 체크'],
]

const adminTab = ['admin', '관리자']

export default function AttendanceScreen() {
  const { member, isAdmin } = useAuth()
  const [tab, setTab] = useState('home')
  const query = useQuery(() => getAttendanceDashboard(member), [member.id], { initialData: emptyAttendanceData() })

  useEffect(() => {
    if (!isAdmin && tab === 'admin') setTab('home')
  }, [isAdmin, tab])

  if (query.loading) return <LoadingState label="출석 시스템을 불러오는 중..." />
  if (query.error) return <ErrorState error={query.error} retry={query.retry} />

  const data = query.data
  const sortedSessions = [...data.sessions].sort(byStartsAtDesc)
  const upcomingSessions = sortedSessions.filter((session) => !isPastSession(session)).slice(0, 3)
  const recentSessions = sortedSessions.filter((session) => isPastSession(session)).slice(0, 3)
  const openSessions = data.sessions.filter((session) => isAttendableNow(session))
  const attendanceRate = data.summary?.attendance_rate ?? null
  const visibleTabs = isAdmin ? [...memberTabs, adminTab] : memberTabs
  const connectionNotice = formatAttendanceNotice(data.memberWarning)

  return (
    <div className="attendance-page">
      {connectionNotice && <div className="partial-data-notice">{connectionNotice}</div>}

      <section className="system-entry-hero attendance-live-hero">
        <div>
          <span>MAST ATTENDANCE</span>
          <h1>출석</h1>
          <p>모임 일정과 출석 체크를 확인해요.</p>
          <button type="button" onClick={() => setTab('check')}>
            출석하기 <ChevronRight />
          </button>
        </div>
        <div className="system-entry-visual">
          <CalendarDays />
          <i />
          <i />
        </div>
      </section>

      <nav className="attendance-tabs" aria-label="출석 메뉴">
        {visibleTabs.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} type="button" onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'home' && (
        <>
          <section className="attendance-summary-grid">
            <article><CalendarDays /><span>예정 모임</span><b>{upcomingSessions.length}</b></article>
            <article><UsersRound /><span>전체 부원</span><b>{data.members.length}</b></article>
            <article><ClipboardCheck /><span>내 출석률</span><b>{attendanceRate == null ? '-' : `${Math.round(attendanceRate)}%`}</b></article>
          </section>

          <section className="attendance-panel">
            <div className="mast-section-heading">
              <h2>예정 모임</h2>
              <button type="button" onClick={() => setTab('sessions')}>전체 보기 <ChevronRight /></button>
            </div>
            <SessionList sessions={upcomingSessions} emptyTitle="예정된 모임이 없습니다" />
          </section>

          <section className="attendance-panel">
            <div className="mast-section-heading">
              <h2>최근 모임</h2>
              <span>출석 내역 확인</span>
            </div>
            <SessionList sessions={recentSessions} records={data.records} emptyTitle="최근 모임이 없습니다" />
          </section>
        </>
      )}

      {tab === 'sessions' && (
        <section className="attendance-panel">
          <div className="mast-section-heading">
            <h2>모임 목록</h2>
            <span>모든 동아리 모임 일정</span>
          </div>
          <SessionList sessions={data.sessions} records={data.records} emptyTitle="아직 모임 일정이 없습니다" />
        </section>
      )}

      {tab === 'check' && (
        <AttendanceCheckForm
          member={member}
          legacyMember={data.legacyMember}
          sessions={openSessions}
          records={data.records}
          onSubmitted={query.retry}
        />
      )}

      {isAdmin && tab === 'admin' && (
        <section className="attendance-panel">
          <div className="attendance-admin-card">
            <LockKeyhole />
            <div>
              <h2>관리자 기능</h2>
              <p>
                모임 등록, 출석코드 관리, 회원별 출석/결석 처리는 통합 관리자 콘솔에서 관리합니다.
              </p>
              <Link className="button primary" to="/admin/attendance">출석 관리자 열기</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function AttendanceCheckForm({ member, legacyMember, sessions, records, onSubmitted }) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedSession = useMemo(() => sessions.find((session) => String(session.id) === String(sessionId)), [sessions, sessionId])
  const alreadyChecked = records.some((record) => String(record.session_id) === String(sessionId))

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await submitAttendance({ currentMember: member, sessionId, code })
      setMessage('출석이 완료되었습니다.')
      setCode('')
      await onSubmitted()
    } catch (err) {
      setError(err.message || '출석 제출에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="attendance-panel">
      <div className="mast-section-heading">
        <h2>출석 체크</h2>
        <span>{legacyMember ? `${legacyMember.name} · ${legacyMember.school ?? ''}` : '회원 연결 필요'}</span>
      </div>
      {!sessions.length ? (
        <EmptyState title="출석 가능한 모임이 없습니다" description="출석 가능한 모임이 열리면 이곳에서 체크할 수 있어요." />
      ) : (
        <form className="attendance-check-form" onSubmit={handleSubmit}>
          <label>
            <span>모임 선택</span>
            <select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
              {sessions.map((session) => <option value={session.id} key={session.id}>{session.title}</option>)}
            </select>
          </label>
          <div className="attendance-readonly-card">
            <b>{member.name}</b>
            <span>{member.school || legacyMember?.school || '-'} · {member.major || legacyMember?.major || '-'}</span>
            <small>{member.generation || legacyMember?.gi || ''}</small>
          </div>
          {selectedSession?.attendance_code_enabled && (
            <label>
              <span>출석 인증코드</span>
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="운영진이 안내한 코드를 입력하세요" />
            </label>
          )}
          {alreadyChecked && <p className="attendance-success">이미 출석이 완료된 모임입니다.</p>}
          {message && <p className="attendance-success">{message}</p>}
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" disabled={busy || alreadyChecked || !legacyMember}>
            {busy ? '제출 중...' : '출석 제출하기'}
          </button>
        </form>
      )}
    </section>
  )
}

function SessionList({ sessions, records = [], emptyTitle }) {
  if (!sessions.length) return <EmptyState title={emptyTitle} description="관리자가 모임을 등록하면 표시됩니다." />
  return (
    <div className="attendance-session-list">
      {sessions.map((session) => {
        const myRecord = records.find((record) => String(record.session_id) === String(session.id))
        return (
        <article key={session.id}>
          <div>
            <b>{session.title}</b>
            <p>{session.description || session.location || '모임 설명이 없습니다.'}</p>
            <small>{formatSessionDate(session)}</small>
          </div>
          <span className={`badge badge-${myRecord?.status || effectiveSessionStatus(session)}`}>{attendanceStatusLabel(myRecord?.status || effectiveSessionStatus(session))}</span>
        </article>
        )
      })}
    </div>
  )
}

function emptyAttendanceData() {
  return { legacyMember: null, sessions: [], records: [], summary: null, members: [], memberWarning: null }
}

function formatAttendanceNotice(warning) {
  if (!warning) return null
  const text = String(warning)
  if (text.includes('permission denied')) {
    return '출석 일정 권한 확인이 필요해요. DB 정책이 열리면 모임 목록과 출석 체크가 표시됩니다.'
  }
  if (text.includes('회원') || text.includes('member')) {
    return '회원 연결 확인이 필요해요. 이름, 학교, 기수 정보가 맞는지 확인해 주세요.'
  }
  return '일부 출석 데이터를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.'
}

function byStartsAtDesc(a, b) {
  return new Date(b.starts_at ?? b.created_at ?? 0).getTime() - new Date(a.starts_at ?? a.created_at ?? 0).getTime()
}

function isPastSession(session) {
  const base = session.ends_at || session.starts_at
  if (!base) return false
  return new Date(base).getTime() < Date.now() || ['closed', 'finished', 'completed'].includes(String(session.status))
}

function formatSessionDate(session) {
  const start = session.starts_at ? new Date(session.starts_at) : null
  const end = session.ends_at ? new Date(session.ends_at) : null
  if (!start || Number.isNaN(start.getTime())) return '일정 미정'
  const date = start.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end && !Number.isNaN(end.getTime()) ? end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''
  return `${date} ${startTime}${endTime ? ` ~ ${endTime}` : ''}`
}
