import { requireSupabase, throwIfError } from './baseService'
import { buildPasswordResetLink, validateResetPassword } from '../utils/passwordReset'

export async function issuePasswordReset(memberId, adminCode) {
  if (!String(adminCode).trim()) throw new Error('관리자 코드를 입력해 주세요.')
  const { data, error } = await requireSupabase().rpc('issue_member_password_reset', {
    p_member_id: memberId,
    p_admin_code: String(adminCode).trim(),
  })
  throwIfError(error)
  return { link: buildPasswordResetLink(window.location.origin, data.token), expiresAt: data.expires_at }
}

export async function requestPasswordReset({ name, school, generation, major, phone }) {
  if (!String(name).trim() || !String(school).trim() || !String(generation).trim()) {
    throw new Error('이름, 학교, 기수를 입력해 주세요.')
  }
  const { data, error } = await requireSupabase().rpc('request_member_password_reset', {
    p_name: String(name).trim(),
    p_school: String(school).trim(),
    p_generation: String(generation).trim(),
    p_major: String(major ?? '').trim(),
    p_phone: String(phone ?? '').trim(),
  })
  throwIfError(error)
  if (data?.error) throw new Error(data.error)
  return { token: data.token, expiresAt: data.expires_at }
}

export async function completePasswordReset(token, password, confirmation) {
  const message = validateResetPassword(password, confirmation)
  if (message) throw new Error(message)
  const { data, error } = await requireSupabase().rpc('complete_member_password_reset', {
    p_token: token,
    p_password: password,
  })
  throwIfError(error)
  if (!data?.ok) throw new Error('비밀번호 변경에 실패했습니다. 다시 시도해 주세요.')
}
