import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { completePasswordReset, requestPasswordReset } from '../services/passwordResetService'
import { resetTokenFromHash } from '../utils/passwordReset'
import { useAuth } from '../context/AuthContext'
import AuthEntry from '../components/AuthEntry'
import SchoolAutocomplete from '../components/SchoolAutocomplete'

const EMPTY_IDENTITY = { name: '', school: '', generation: '', phone: '' }

export default function ResetPasswordScreen() {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const linkToken = resetTokenFromHash(location.hash)
  const [verifiedToken, setVerifiedToken] = useState('')
  const token = linkToken || verifiedToken
  const [identity, setIdentity] = useState(EMPTY_IDENTITY)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const updateIdentity = (key, value) => setIdentity((prev) => ({ ...prev, [key]: value }))

  const verify = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await requestPasswordReset(identity)
      setVerifiedToken(result.token)
    } catch (err) {
      setError(err.message || '본인 확인에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

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
      if (linkToken) navigate('/reset-password', { replace: true })
    } catch (err) {
      setError(err.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return <AuthEntry title={done ? '비밀번호를 변경했어요' : '비밀번호 재설정'}>
      {done ? <>
        <p>새 비밀번호로 로그인해 주세요. 기존 활동과 팀 정보는 그대로 유지됩니다.</p>
        <Link className="auth-button auth-button-primary" to="/login">로그인하기</Link>
      </> : token ? <>
        <p>새 비밀번호를 입력해 주세요.{linkToken ? ' 이 링크는 발급 후 30분 동안 한 번만 사용할 수 있어요.' : ''}</p>
        <form className="auth-form" onSubmit={submit}>
          <label>새 비밀번호<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required disabled={busy} /></label>
          <small>영문과 숫자를 포함해 8자 이상 입력해 주세요.</small>
          <label>새 비밀번호 확인<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={128} required disabled={busy} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="auth-button auth-button-primary" disabled={busy}>{busy ? '변경 중...' : '새 비밀번호 저장'}</button>
        </form>
      </> : <>
        <p>등록된 이름, 학교, 기수, 전화번호를 입력해 주세요.</p>
        <form className="auth-form" onSubmit={verify}>
          <label>이름<input value={identity.name} onChange={(event) => updateIdentity('name', event.target.value)} autoComplete="name" required disabled={busy} /></label>
          <SchoolAutocomplete value={identity.school} onChange={(value) => updateIdentity('school', value)} disabled={busy} />
          <label>기수<select value={identity.generation} onChange={(event) => updateIdentity('generation', event.target.value)} required disabled={busy}><option value="">기수를 선택하세요</option>{[1, 2, 3].map((generation) => <option key={generation} value={generation}>{generation}기</option>)}</select></label>
          <label>전화번호<input value={identity.phone} onChange={(event) => updateIdentity('phone', event.target.value)} inputMode="tel" autoComplete="tel" type="tel" placeholder="전화번호" required disabled={busy} /></label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="auth-button auth-button-primary" disabled={busy}>{busy ? '확인 중...' : '본인 확인하고 재설정'}</button>
        </form>
      </>}
      {!done && <>
        <div className="auth-help"><p>비밀번호 재설정이 어려울 시 문의 부탁드립니다</p><a href="https://open.kakao.com/o/see0a8vi" target="_blank" rel="noopener noreferrer">개별 문의 ↗</a></div>
        <div className="auth-actions"><Link className="auth-button auth-button-secondary" to="/login">로그인으로 돌아가기</Link></div>
      </>}
  </AuthEntry>
}
