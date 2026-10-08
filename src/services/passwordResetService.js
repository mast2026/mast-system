import { serverAuth } from './serverAuthService'
import { buildPasswordResetLink, validateResetPassword } from '../utils/passwordReset'

export async function issuePasswordReset(memberId, adminCode) {
  if (!String(adminCode).trim()) throw new Error('관리자 코드를 입력해 주세요.')
  const data = await serverAuth('issue-reset', { memberId, adminCode: String(adminCode).trim() })
  return { link: buildPasswordResetLink(window.location.origin, data.token), expiresAt: data.expires_at }
}
export async function requestPasswordReset({ name, school, generation, phone }) {
  if (![name, school, generation, phone].every(v => String(v ?? '').trim())) throw new Error('이름, 학교, 기수, 전화번호를 입력해 주세요.')
  const data = await serverAuth('request-reset', { name, school, generation, phone })
  return { token: data.token, expiresAt: data.expires_at }
}
export async function completePasswordReset(token, password, confirmation) {
  const message = validateResetPassword(password, confirmation)
  if (message) throw new Error(message)
  const data = await serverAuth('complete-reset', { token, password })
  if (!data?.ok) throw new Error('비밀번호 변경에 실패했습니다.')
}
