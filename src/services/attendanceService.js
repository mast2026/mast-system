import { requireSupabase, throwIfError } from './baseService'

const SESSION_TABLE = 'activity_sessions'
const RECORD_TABLE = 'activity_attendance_records'
const SUMMARY_VIEW = 'activity_attendance_summary_view'
const LEGACY_MEMBERS_TABLE = 'members'

// 지금 이 시점에 실제로 출석 체크가 가능한 모임만 반환합니다.
// (홈 화면 "오늘 할 일"에서 출석 모임이 없을 때 버튼이 뜨지 않도록 사용)
export function isAttendableNow(session, now = Date.now()) {
  if (!session) return false
  const status = String(session.status ?? 'scheduled').toLowerCase()
  if (['closed', 'cancelled', 'finished', 'completed'].includes(status)) return false
  const toMs = (value) => {
    if (!value) return null
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? null : time
  }
  const openAt = toMs(session.attendance_open_at) ?? toMs(session.starts_at)
  const closeAt = toMs(session.attendance_close_at) ?? toMs(session.ends_at)
    ?? (toMs(session.starts_at) != null ? toMs(session.starts_at) + 3 * 60 * 60 * 1000 : null)
  if (openAt != null && now < openAt) return false
  if (closeAt != null && now > closeAt) return false
  // 출석 가능 시간대가 전혀 지정되지 않은 모임은 status가 명시적으로 'open'일 때만 노출
  if (openAt == null && closeAt == null) return status === 'open'
  return true
}

export async function getActiveAttendanceSessions() {
  const client = requireSupabase()
  const { data, error } = await client
    .from(SESSION_TABLE)
    .select('*')
    .order('starts_at', { ascending: false })
  if (error) return []
  const now = Date.now()
  return (data ?? []).filter((session) => isAttendableNow(session, now))
}

export async function getAttendanceDashboard(currentMember) {
  const client = requireSupabase()
  const legacyMember = await findAttendanceMember(currentMember)

  const [sessionsRes, recordsRes, summaryRes, membersRes] = await Promise.all([
    client.from(SESSION_TABLE).select('*').order('starts_at', { ascending: false }),
    legacyMember
      ? client.from(RECORD_TABLE).select('*').eq('member_id', legacyMember.id).order('checked_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    legacyMember
      ? client.from(SUMMARY_VIEW).select('*').eq('member_id', legacyMember.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client.from(LEGACY_MEMBERS_TABLE).select('id,name,school,major,gi,status').limit(500),
  ])

  const warnings = []
  if (sessionsRes.error) warnings.push(`모임 일정: ${sessionsRes.error.message}`)
  if (recordsRes.error) warnings.push(`내 출석 기록: ${recordsRes.error.message}`)
  if (summaryRes.error && summaryRes.error.code !== 'PGRST116') warnings.push(`출석 요약: ${summaryRes.error.message}`)
  if (membersRes.error) warnings.push(`부원 목록: ${membersRes.error.message}`)

  return {
    legacyMember,
    sessions: sessionsRes.error ? [] : (sessionsRes.data ?? []),
    records: recordsRes.error ? [] : (recordsRes.data ?? []),
    summary: summaryRes.error ? null : (summaryRes.data ?? null),
    members: membersRes.error ? [] : (membersRes.data ?? []),
    memberWarning: [
      !legacyMember ? '출석용 members 회원 정보와 연결되지 않았습니다.' : null,
      warnings.length ? `일부 출석 데이터 권한 확인 필요: ${warnings.join(' / ')}` : null,
    ].filter(Boolean).join(' '),
  }
}

export async function submitAttendance({ currentMember, sessionId, code }) {
  if (!sessionId) throw new Error('출석할 모임을 선택해 주세요.')
  const client = requireSupabase()
  const legacyMember = await findAttendanceMember(currentMember)
  if (!legacyMember) throw new Error('출석용 회원 정보를 찾지 못했습니다. members 테이블의 이름/학교/기수를 확인해 주세요.')

  const { data: session, error: sessionError } = await client
    .from(SESSION_TABLE)
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  throwIfError(sessionError)
  if (!session) throw new Error('모임 정보를 찾지 못했습니다.')

  validateAttendanceSession(session, code)

  const { data: existing, error: existingError } = await client
    .from(RECORD_TABLE)
    .select('id,status,checked_at')
    .eq('session_id', session.id)
    .eq('member_id', legacyMember.id)
    .maybeSingle()
  throwIfError(existingError)
  if (existing) throw new Error('이미 출석이 완료된 모임입니다.')

  const payload = {
    session_id: session.id,
    member_id: legacyMember.id,
    status: 'present',
    checked_at: new Date().toISOString(),
    points: Number(session.base_points ?? 1),
  }

  const { data, error } = await client
    .from(RECORD_TABLE)
    .insert(payload)
    .select('*')
    .single()
  throwIfError(error)
  return data
}

export async function findAttendanceMember(currentMember) {
  if (!currentMember) return null
  const client = requireSupabase()

  if (currentMember.mast_member_id) {
    const { data, error } = await client
      .from(LEGACY_MEMBERS_TABLE)
      .select('*')
      .eq('id', currentMember.mast_member_id)
      .maybeSingle()
    if (!error && data) return data
  }

  const { data, error } = await client
    .from(LEGACY_MEMBERS_TABLE)
    .select('*')
    .order('name', { ascending: true })
  throwIfError(error)

  const name = normalize(currentMember.name)
  const school = normalize(currentMember.school)
  const generation = generationNumber(currentMember.generation)

  const list = data ?? []
  const strict = list.find((member) => {
    const nameMatched = normalize(member.name) === name
    const schoolMatched = !school || normalize(member.school) === school
    const giMatched = !generation || generationNumber(member.gi) === generation || generationNumber(member.generation) === generation
    return nameMatched && schoolMatched && giMatched
  })
  if (strict) return strict
  // 학교/기수가 조금 달라도 이름이 유일하게 일치하면 연결 (연결 실패 방지)
  const byName = list.filter((member) => normalize(member.name) === name)
  return byName.length === 1 ? byName[0] : null
}

function validateAttendanceSession(session, code) {
  const status = String(session.status ?? '').toLowerCase()
  if (status && !['open', 'scheduled'].includes(status)) {
    throw new Error(status === 'closed' ? '출석이 마감된 모임입니다.' : '출석할 수 없는 모임입니다.')
  }

  const now = Date.now()
  if (session.attendance_open_at && now < new Date(session.attendance_open_at).getTime()) {
    throw new Error('아직 출석 가능 시간이 아닙니다.')
  }
  if (session.attendance_close_at && now > new Date(session.attendance_close_at).getTime()) {
    throw new Error('출석 가능 시간이 지났습니다.')
  }

  if (session.attendance_code_enabled) {
    const expected = String(session.attendance_code ?? '').trim()
    const received = String(code ?? '').trim()
    if (!received) throw new Error('출석 인증코드를 입력해 주세요.')
    if (expected && expected !== received) throw new Error('출석 인증코드가 일치하지 않습니다.')
  }
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function generationNumber(value) {
  return String(value ?? '').replace(/[^0-9]/g, '')
}

export function attendanceStatusLabel(status) {
  const map = {
    scheduled: '예정',
    open: '출석 가능',
    closed: '출석 마감',
    cancelled: '취소',
    present: '출석',
    late: '지각',
    absent: '결석',
    excused: '면제',
  }
  return map[status] ?? status ?? '-'
}
