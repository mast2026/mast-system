import { TABLES, requireSupabase, selectOne, throwIfError } from './baseService'

const PUBLIC_MEMBER_FIELDS = 'id,mast_member_id,name,school,major,generation,role,is_leader,position_title,created_at,updated_at'
const ADMIN_LOGIN_CODE = import.meta.env.VITE_ADMIN_LOGIN_CODE || 'MAST-ADMIN'
const ADMIN_ROLES = ['admin', 'manager', 'professor']
let passwordCapabilityPromise

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
  return data ?? []
}

export async function getMember(id) {
  return selectOne(TABLES.members, id)
}

export async function findMemberByName(name) {
  const { data: members, error } = await requireSupabase().from(TABLES.members).select(PUBLIC_MEMBER_FIELDS).order('id', { ascending: true })
  throwIfError(error)
  const keyword = name.trim().toLocaleLowerCase()
  return members.find((member) => String(member.name ?? '').trim().toLocaleLowerCase() === keyword) ?? null
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
  const member = await findMemberByName(name)
  if (!member) throw new Error('일치하는 회원이 없습니다.')
  if (roles?.length && !roles.includes(member.role)) throw new Error('선택한 로그인 유형과 회원 권한이 일치하지 않습니다.')

  const alreadySet = await checkHasPassword(member.id)
  if (alreadySet) throw new Error('이미 비밀번호가 설정된 계정입니다. 이름과 비밀번호로 로그인하세요.')

  const schoolMatch = normalizeStr(member.school) === normalizeStr(school)
  const genA = extractNum(member.generation)
  const genB = extractNum(generation)
  const generationMatch = genA !== '' && genB !== '' && genA === genB
  if (!schoolMatch || !generationMatch) throw new Error('학교 또는 기수 정보가 일치하지 않습니다.')

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
  const member = await findMemberByName(name)
  if (!member) throw new Error('일치하는 회원이 없습니다.')
  if (roles?.length && !roles.includes(member.role)) throw new Error('선택한 로그인 유형과 회원 권한이 일치하지 않습니다.')
  if (!password || password.length < 4) throw new Error('비밀번호는 4자 이상 입력하세요.')

  const storedHashes = await getStoredPasswordHashes(member.id)

  if (!storedHashes.length) throw new Error('비밀번호가 설정되지 않았습니다. 첫 로그인을 진행해 주세요.')

  const nextHash = await hashPassword(password)
  const trimmedPassword = String(password)
  const isMatched = storedHashes.some((storedHash) => storedHash === nextHash || storedHash === trimmedPassword)
  if (!isMatched) throw new Error('비밀번호가 일치하지 않습니다.')
  return member
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

export async function loginAdminWithCode(code) {
  const adminCode = String(code ?? '').trim()
  if (!adminCode) throw new Error('관리자 코드를 입력하세요.')
  if (adminCode !== ADMIN_LOGIN_CODE) throw new Error('관리자 코드가 일치하지 않습니다.')
  const { data, error } = await requireSupabase()
    .from(TABLES.members)
    .select(PUBLIC_MEMBER_FIELDS)
    .in('role', ADMIN_ROLES)
    .order('role', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('DB에 관리자 계정이 없습니다.')
  return data
}

export async function loginPrivilegedMemberWithCode(memberId, code) {
  const adminCode = String(code ?? '').trim()
  if (!memberId) throw new Error('관리자 계정을 선택하세요.')
  if (!adminCode) throw new Error('관리자 코드를 입력하세요.')
  if (adminCode !== ADMIN_LOGIN_CODE) throw new Error('관리자 코드가 일치하지 않습니다.')
  const { data, error } = await requireSupabase()
    .from(TABLES.members)
    .select(PUBLIC_MEMBER_FIELDS)
    .eq('id', memberId)
    .maybeSingle()
  throwIfError(error)
  if (!data) throw new Error('관리자 계정을 찾을 수 없습니다.')
  if (!ADMIN_ROLES.includes(data.role)) throw new Error('관리자 페이지 접근 권한이 없는 회원입니다.')
  return data
}

async function hashPassword(password) {
  const input = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
