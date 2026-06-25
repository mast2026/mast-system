import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Megaphone, ShieldCheck, Trophy, UserRound, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import LoadingCloud from '../components/common/LoadingCloud'
import { useAuth } from '../context/AuthContext'
import { loginAdminWithCode } from '../services/memberService'

export default function AdminLoginScreen() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [adminCode, setAdminCode] = useState('')
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const member = await Promise.race([
        loginAdminWithCode(adminCode),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB 연결을 확인해 주세요.')), 8000)),
      ])
      login(member)
      navigate('/admin', { replace: true })
    } catch (e) {
      setMessage(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="login-v2">
    <section className="login-v2-hero">
      <div className="login-v2-hero-copy">
        <h1>운영 콘솔,<br />더 쉽게 <span className="accent">관리</span>하다</h1>
        <p>관리자 코드로 접속해<br />회원·공모전·홍보·출석을 한 곳에서 관리하세요.</p>
      </div>
      <div className="login-v2-art">
        <img src="/assets/hero/login-hero.webp" alt="" aria-hidden="true" />
        <span className="lv2-bubble trophy"><Trophy /></span>
        <span className="lv2-bubble users"><Users /></span>
        <span className="lv2-bubble mega"><Megaphone /></span>
        <i className="lv2-dot d1" /><i className="lv2-dot d2" /><i className="lv2-dot d3" />
      </div>
      <svg className="login-v2-wave" viewBox="0 0 1000 190" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 62 C128 18 266 37 410 84 C548 129 708 148 825 86 C914 39 952 8 1000 36 L1000 190 L0 190 Z" />
      </svg>
    </section>

    <section className="login-v2-form">
      <h2>관리자 로그인</h2>
      <p className="login-v2-sub">관리자 코드를 입력하면 운영 콘솔로 이동합니다.</p>

      <form onSubmit={submit}>
        <div className="login-input">
          <Lock className="login-input-icon" />
          <input type={show ? 'text' : 'password'} value={adminCode} onChange={(e) => { setAdminCode(e.target.value); setMessage('') }} placeholder="관리자 코드를 입력하세요" autoComplete="off" required />
          <button type="button" className="login-eye" onClick={() => setShow((s) => !s)} aria-label={show ? '코드 숨기기' : '코드 보기'}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {message && <div className="login-v2-note error">{message}</div>}

        <button className="login-v2-submit" disabled={submitting}>
          {submitting ? <LoadingCloud size="small" text="확인 중..." /> : <><ShieldCheck size={18} /> 관리자 콘솔로 이동 <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="login-v2-divider"><span>또는</span></div>

      <Link className="login-v2-alt-btn solo" to="/login">
        <UserRound size={18} /> 회원 로그인
      </Link>
    </section>
  </main>
}
