import { TABLES, requireSupabase, throwIfError, MEMBER_FIELDS } from './baseService'
import { establishSession, serverAuth } from './serverAuthService'

export async function getMembers() {
  const { data, error } = await requireSupabase().from(TABLES.members).select(MEMBER_FIELDS).eq('roster_status', 'active').order('id', { ascending: true })
  throwIfError(error)
  return data ?? []
}

export async function getMember(id) {
  const { data, error } = await requireSupabase().from(TABLES.members).select(MEMBER_FIELDS).eq('id', id).in('roster_status', ['active', 'system']).maybeSingle()
  throwIfError(error)
  return data
}

export async function findMembersByName(name) {
  const data = await serverAuth('lookup', { name: String(name ?? '').trim() })
  return data.members ?? []
}

export async function findMemberByName(name) {
  return (await findMembersByName(name))[0] ?? null
}

export async function loginWithPassword(name, password, { memberId } = {}) {
  return establishSession('login', { name: String(name ?? '').trim(), password, memberId })
}

export async function loginFirstTime(name, school, generation, password, confirmation, { memberId, phone } = {}) {
  if (password !== confirmation) throw new Error('비밀번호 확인이 일치하지 않습니다.')
  return establishSession('first-login', { name: String(name ?? '').trim(), school, generation, password, memberId, phone })
}

export async function loginAdminWithCode(code) {
  return establishSession('admin-login', { code: String(code ?? '').trim() })
}
