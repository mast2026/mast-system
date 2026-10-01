import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { completePasswordReset } from '../services/passwordResetService'
import { resetTokenFromHash } from '../utils/passwordReset'
import { useAuth } from '../context/AuthContext'
import './password-reset.css'

export default function ResetPasswordScreen() {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const token = resetTokenFromHash(location.hash)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await completePasswordReset(token, password, confirmation)
      logout()
      setPassword('')
      setConfirmation('')
      setDone(true)
      navigate('/reset-password', { replace: true })
    } catch (err) {
      setError(err.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="password-reset-page">
    <section className="password-reset-card">
      <h1>{done ? '비밀번호를 변경했어요' : '비밀번호 재설정'}</h1>
      {done ? <>
        <p>새 비밀번호로 로그인해 주세요. 기존 활동과 팀 정보는 그대로 유지됩니다.</p>
        <Link className="button primary" to="/login">로그인하기</Link>
      </> : token ? <>
        <p>새 비밀번호를 입력해 주세요. 이 링크는 발급 후 30분 동안 한 번만 사용할 수 있어요.</p>
        <form className="data-form" onSubmit={submit}>
          <label>새 비밀번호<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required disabled={busy} /></label>
          <small>영문과 숫자를 포함해 8자 이상 입력해 주세요.</small>
          <label>새 비밀번호 확인<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={128} required disabled={busy} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary" disabled={busy}>{busy ? '변경 중...' : '새 비밀번호 저장'}</button>
        </form>
      </> : <>
        <p>운영진에게 이름, 학교, 기수를 알려주고 비밀번호 재설정 링크를 요청해 주세요. 본인 확인 후 링크를 안내해 드립니다.</p>
        <p>받은 링크를 열면 새 비밀번호를 설정할 수 있어요.</p>
      </>}
      {!done && <Link className="password-reset-back" to="/login">로그인으로 돌아가기</Link>}
    </section>
  </main>
}
