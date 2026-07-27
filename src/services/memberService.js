import { TABLES, requireSupabase, selectOne, throwIfError } from './baseService'

const PUBLIC_MEMBER_FIELDS = 'id,mast_member_id,name,school,major,generation,role,is_leader,position_title,created_at,updated_at'
const ADMIN_ROLES = ['admin', 'manager', 'professor']
let passwordCapabilityPromise

function normalizeAdminSections(value) {
  let arr = value
  if (typeof value === 'string') {
    try { arr = JSON.parse(value) } catch { arr = [] }
  }
  return Array.isArray(arr) ? arr.map(String).filter(Boolean) : []
}

async function getAdminSectionMap(ids) {
  const uniqueIds = [...new Set((ids ?? []).filter((id) => id !== undefined && id !== null))]
  if (!uniqueIds.length) return {}
  try {
    const { data, error } = await requireSupabase()
      .from(TABLES.members)
      .select('id,admin_sections')
      .in('id', uniqueIds)
    if (error) return {}
    const map = {}
    ;(data ?? []).forEach((row) => { map[row.id] = normalizeAdminSections(row.admin_sections) })
    return map
  } catch {
    return {}
  }
}

async function attachAdminSections(rows) {
  if (Array.isArray(rows)) {
    const map = await getAdminSectionMap(rows.map((row) => row.id))
    return rows.map((row) => ({ ...row, admin_sections: map[row.id] ?? normalizeAdminSections(row.admin_sections) }))
  }
  if (!rows) return rows
  const map = await getAdminSectionMap([rows.id])
  return { ...rows, admin_sections: map[rows.id] ?? normalizeAdminSections(rows.admin_sections) }
}

async function detectPasswordCapabilities() {
  if (!passwordCapabilityPromise) {
    passwordCapabilityPromise = (async () => {
      const client = requireSupabase()
      const [memberColumns, passwordTable] = await Promise.all([
        client.from(TABLES.members).select('password_hash,password_set_at').limit(1),
        client.from(TABLES.memberPasswords).select('member_id,password_hash').limit(1),
      ])
      return {
        memberColumns: !memberColumns.error,
        passwordTable: !passwordTable.error,
      }
    })()
  }
  return passwordCapabilityPromise
}

export async function getMembers() {
  const { data, error } = await requireSupabase().from(TABLES.members).select(PUBLIC_MEMBER_FIELDS).order('id', { ascending: true })
  throwIfError(error)
  return attachAdminSections(data ?? [])
}

export async function getMember(id) {
  return attachAdminSections(await selectOne(TABLES.members, id))
}

export async function findMemberByName(name) {
  const list = await findMembersByName(name)
  return list[0] ?? null
}

// 같은 이름의 회원이 여러 명(동명이인)일 수 있으므로 전부 반환합니다.
export async function findMembersByName(name) {
  const { data: members, error } = await requireSupabase().from(TABLES.members).select(PUBLIC_MEMBER_FIELDS).order('id', { ascending: true })
  throwIfError(error)
  const rows = await attachAdminSections(members ?? [])
  const keyword = String(name ?? '').trim().toLocaleLowerCase()
  return rows.filter((member) => String(member.name ?? '').trim().toLocaleLowerCase() === keyword)
}

export async function checkHasPassword(memberId) {
  const client = requireSupabase()
  const capabilities = await detectPasswordCapabilities()

  if (capabilities.memberColumns) {
    const { data } = await client
      .from(TABLES.members)
      .select('password_hash')
      .eq('id', memberId)
      .maybeSingle()
    if (data?.password_hash) return true
  }

  if (capabilities.passwordTable) {
    const { data } = await client
      .from(TABLES.memberPasswords)
      .select('id')
      .eq('member_id', memberId)
      .maybeSingle()
    return Boolean(data)
  }

  return false
}

// 숫자만 추출해서 비교 (기수: "1기" = 1 = "1" 모두 같게 처리)
const extractNum = (v) => String(v ?? '').replace(/[^0-9]/g, '')
const normalizeStr = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

export async function loginFirstTime(name, school, generation, newPassword, confirmPassword, { roles } = {}) {
  let candidates = await findMembersByName(name)
  if (roles?.length) candidates = candidates.filter((m) => roles.includes(m.role))
  if (!candidates.length) throw new Error('일치하는 회원이 없습니다.')

  // 비밀번호가 아직 없는 후보만 추림
  const passwordStates = await Promise.all(candidates.map((m) => checkHasPassword(m.id)))
  const passwordless = candidates.filter((_, i) => !passwordStates[i])
  if (!passwordless.length) throw new Error('이미 비밀번호가 설정된 계정입니다. 이름과 비밀번호로 로그인하세요.')

  let member
  if (passwordless.length === 1) {
    // 동명이인이 아니면 이름으로 특정되므로 학교 정확 일치를 요구하지 않음
    member = passwordless[0]
  } else {
    // 동명이인: 학교/기수로 구분 (로그인 화면 드롭다운이 DB값을 그대로 채워줌)
    const inSchool = normalizeStr(school)
    const inGen = extractNum(generation)
    const matches = passwordless.filter((m) => {
      const dbSchool = normalizeStr(m.school)
      const dbGen = extractNum(m.generation)
      return (!dbSchool || dbSchool === inSchool) && (dbGen === '' || (inGen !== '' && dbGen === inGen))
    })
    if (matches.length !== 1) throw new Error('동명이인입니다. 본인 학교·기수를 정확히 선택해 주세요.')
    member = matches[0]
  }

  if (!newPassword || newPassword.length < 4) throw new Error('비밀번호는 4자 이상 입력하세요.')
  if (newPassword !== confirmPassword) throw new Error('비밀번호 확인이 일치하지 않습니다.')

  const nextHash = await hashPassword(newPassword)
  const client = requireSupabase()
  const capabilities = await detectPasswordCapabilities()

  if (capabilities.memberColumns) {
    const { error } = await client
      .from(TABLES.members)
      .update({ password_hash: nextHash, password_set_at: new Date().toISOString() })
      .eq('id', member.id)
    if (!error) return member
  }

  if (!capabilities.passwordTable) throw new Error('비밀번호 저장 컬럼 또는 테이블을 찾을 수 없습니다.')
  const { error } = await client
    .from(TABLES.memberPasswords)
    .insert({ member_id: member.id, password_hash: nextHash })
  throwIfError(error)
  return member
}

export async function loginWithPassword(name, password, { roles } = {}) {
  let candidates = await findMembersByName(name)
  if (roles?.length) candidates = candidates.filter((m) => roles.includes(m.role))
  if (!candidates.length) throw new Error('일치하는 회원이 없습니다.')
  if (!password || password.length < 4) throw new Error('비밀번호는 4자 이상 입력하세요.')

  const nextHash = await hashPassword(password)
  const trimmedPassword = String(password)
  let anyHasPassword = false
  // 동명이인 후보를 모두 검사해, 비밀번호가 일치하는 회원으로 로그인합니다.
  for (const member of candidates) {
    const storedHashes = await getStoredPasswordHashes(member.id)
    if (!storedHashes.length) continue
    anyHasPassword = true
    if (storedHashes.some((storedHash) => storedHash === nextHash || storedHash === trimmedPassword)) return member
  }
  if (!anyHasPassword) throw new Error('비밀번호가 설정되지 않았습니다. 첫 로그인을 진행해 주세요.')
  throw new Error('비밀번호가 일치하지 않습니다.')
}

async function getStoredPasswordHashes(memberId) {
  const client = requireSupabase()
  const capabilities = await detectPasswordCapabilities()
  const hashes = []

  if (capabilities.memberColumns) {
    const { data } = await client
      .from(TABLES.members)
      .select('password_hash')
      .eq('id', memberId)
      .maybeSingle()
    if (data?.password_hash) hashes.push(data.password_hash)
  }

  if (capabilities.passwordTable) {
    const { data } = await client
      .from(TABLES.memberPasswords)
      .select('password_hash')
      .eq('member_id', memberId)
      .maybeSingle()
    if (data?.password_hash) hashes.push(data.password_hash)
  }

  return [...new Set(hashes.filter(Boolean))]
}

// 관리자 코드는 클라이언트에서 비교하지 않습니다. 실제 코드값은 DB에만 있고,
// Supabase RPC(verify_admin_code)가 서버에서 검증합니다. (supabase/secure-admin-code.sql)
export async function loginAdminWithCode(code) {
  const adminCode = String(code ?? '').trim()
  if (!adminCode) throw new Error('관리자 코드를 입력하세요.')
  const { data, error } = await requireSupabase().rpc('verify_admin_code', { p_code: adminCode })
  throwIfError(error)
  if (!data) throw new Error('관리자 코드가 일치하지 않습니다.')
  return attachAdminSections(data)
}

async function hashPassword(password) {
  const input = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
