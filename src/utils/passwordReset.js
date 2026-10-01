export function validateResetPassword(password, confirmation) {
  if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return '비밀번호는 영문과 숫자를 포함해 8~128자로 입력해 주세요.'
  }
  if (password !== confirmation) return '비밀번호 확인이 일치하지 않습니다.'
  return ''
}

export function resetTokenFromHash(hash) {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token') || ''
  return /^[a-f0-9]{64}$/.test(token) ? token : ''
}

export function buildPasswordResetLink(origin, token) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('재설정 링크 발급에 실패했습니다.')
  return `${origin}/reset-password#token=${token}`
}
