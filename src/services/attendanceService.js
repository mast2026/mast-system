import { requireSupabase, throwIfError, TABLES } from './baseService'

const SESSION_TABLE = 'activity_sessions'
const RECORD_TABLE = 'activity_attendance_records'
const SUMMARY_VIEW = 'activity_attendance_summary_view'
const LEGACY_MEMBERS_TABLE = 'members'

const toMs = (value) => {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

// 모임의 "현재 상태"를 시간 기준으로 계산합니다.
// 관리자가 status를 'scheduled'로 둬도, 시작 시각이 지나면 자동으로 '출석 가능(open)'으로 봅니다.
//  - 'closed' : 마감/취소됐거나, 출석 마감 시각이 지남
//  - 'scheduled' : 아직 출석 시작 전(예정)
//  - 'open' : 지금 출석 체크 가능
export function effectiveSessionStatus(session, now = Date.now()) {
  if (!session) return 'closed'
  const raw = String(session.status ?? 'scheduled').toLowerCase()
  if (['closed', 'cancelled', 'finished', 'completed'].includes(raw)) return 'closed'
  const start = toMs(session.starts_at)
  // 출석 시작: 코드 오픈 시각 → 없으면 모임 시작 시각
  const openAt = toMs(session.attendance_open_at) ?? start
  // 출석 마감: 코드 마감 → 종료 시각 → (시작+6시간) 순으로 결정
  const closeAt = toMs(session.attendance_close_at)
    ?? toMs(session.ends_at)
    ?? (start != null ? start + 6 * 60 * 60 * 1000 : null)
  // 시간 정보가 전혀 없으면 status에 따름
  if (openAt == null && closeAt == null) return raw === 'open' ? 'open' : 'scheduled'
  if (openAt != null && now < openAt) return 'scheduled'
  if (closeAt != null && now > closeAt) return 'closed'
  return 'open'
}

// 지금 이 시점에 실제로 출석 체크가 가능한 모임인지 (시간 기준)
export function isAttendableNow(session, now = Date.now()) {
  return effectiveSessionStatus(session, now) === 'open'
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

  // 정시 기준 시각(ontime_at) 이후 체크하면 지각. 없으면 모임 시작 일시 기준.
  // 지각 30분 이내 -1점, 30분 초과 -3점 (감점은 points에 기록).
  const tier = classifyAttendance(session, Date.now())
  const payload = {
    session_id: session.id,
    member_id: legacyMember.id,
    status: tier.status,
    checked_at: new Date().toISOString(),
    points: tier.status === 'present' ? Number(session.base_points ?? 1) : tier.points,
  }

  const { data, error } = await client
    .from(RECORD_TABLE)
    .insert(payload)
    .select('*')
    .single()
  throwIfError(error)

  // 지각이면 활동날씨 점수에 자동 반영 (30분 이내 -1 / 초과 -3)
  if (tier.status === 'late' && currentMember?.id != null) {
    try {
      await client.from(TABLES.scoreEvents).insert({
        member_id: Number(currentMember.id),
        event_type: tier.points <= -3 ? 'ot_late' : 'ot_late_30',
        points: tier.points,
        verified: true,
        metadata: { reason: `${session.title || '모임'} 지각 · ${tier.label}` },
      })
    } catch { /* 점수 자동배정 실패는 출석 자체를 막지 않음 */ }
  }
  return { ...data, lateInfo: tier }
}

// 출석 시각을 정시 기준과 비교해 present / 지각(30분 이내, -1) / 지각(30분 초과, -3) 으로 분류
export function classifyAttendance(session, now = Date.now()) {
  const ontimeRaw = session?.ontime_at ?? session?.starts_at ?? null
  const ontimeMs = ontimeRaw ? new Date(ontimeRaw).getTime() : null
  if (ontimeMs == null || Number.isNaN(ontimeMs)) {
    return { status: 'present', points: 0, label: '출석', minutesLate: 0 }
  }
  const minutesLate = Math.floor((now - ontimeMs) / 60000)
  if (minutesLate > 30) return { status: 'late', points: -3, label: '지각(30분 초과)', minutesLate }
  if (minutesLate > 0) return { status: 'late', points: -1, label: '지각(30분 이내)', minutesLate }
  return { status: 'present', points: 0, label: '출석', minutesLate: 0 }
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
  // status 문자열이 아니라 시간 기준 상태로 판정합니다. (시작 시각이 지나면 'scheduled' 라도 출석 가능)
  const eff = effectiveSessionStatus(session)
  if (eff === 'scheduled') throw new Error('아직 출석 가능 시간이 아닙니다.')
  if (eff === 'closed') throw new Error('출석 가능 시간이 지났거나 마감된 모임입니다.')

  // 출석코드: 코드가 실제로 설정된 모임만 검사합니다. (코드 사용 ON 인데 코드 미설정이면 코드 없이 통과)
  if (session.attendance_code_enabled) {
    const expected = String(session.attendance_code ?? '').trim()
    if (expected) {
      const received = String(code ?? '').trim()
      if (!received) throw new Error('출석 인증코드를 입력해 주세요.')
      if (expected !== received) throw new Error('출석 인증코드가 일치하지 않습니다.')
    }
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
