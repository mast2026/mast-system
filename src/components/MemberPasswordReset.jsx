import { useState } from 'react'
import { issuePasswordReset } from '../services/passwordResetService'
import '../screens/password-reset.css'

export default function MemberPasswordReset({ member }) {
  const [adminCode, setAdminCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const issue = async () => {
    if (busy) return
    if (!window.confirm(`${member.name} · ${member.school || '학교 미정'} · ${member.generation || '-'}기 회원의 본인 확인을 마쳤나요? 새 링크를 발급하면 이전 재설정 링크는 사용할 수 없습니다.`)) return
    setBusy(true)
    setResult(null)
    setMessage('')
    try {
      setResult(await issuePasswordReset(member.id, adminCode))
      setAdminCode('')
    } catch (err) {
      setMessage(err.message || '링크 발급에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.link)
      setMessage('재설정 링크를 복사했습니다. 본인 확인한 회원에게 전달해 주세요.')
    } catch {
      setMessage('아래 링크를 선택해서 직접 복사해 주세요.')
    }
  }
  return <section className="password-reset-admin">
    <h3>비밀번호 재설정</h3>
    <p>본인 확인 후 관리자 코드를 입력해 주세요. 회원이 링크에서 새 비밀번호를 저장하기 전까지 기존 비밀번호는 유지됩니다.</p>
    <label>관리자 코드<input type="password" value={adminCode} onChange={(event) => setAdminCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (adminCode.trim()) issue() } }} autoComplete="off" disabled={busy} /></label>
    <button type="button" className="button secondary" onClick={issue} disabled={busy || !adminCode.trim()}>{busy ? '발급 중...' : '재설정 링크 발급'}</button>
    {result && <>
      <label>회원에게 전달할 링크<textarea readOnly value={result.link} onFocus={(event) => event.target.select()} /></label>
      <small>만료: {new Date(result.expiresAt).toLocaleString('ko-KR')} · 한 번만 사용 가능</small>
      <button type="button" className="button secondary" onClick={copy}>링크 복사</button>
    </>}
    {message && <p role="status">{message}</p>}
  </section>
}
