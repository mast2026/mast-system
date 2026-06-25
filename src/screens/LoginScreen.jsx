import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Megaphone, ShieldCheck, Trophy, UserRound, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { checkHasPassword, getMembers, loginFirstTime, loginWithPassword } from '../services/memberService'
import useQuery from '../hooks/useQuery'
import LoadingCloud from '../components/common/LoadingCloud'

const memberLoginMode = { label: '회원', roles: null, next: '/' }

function PasswordField({ id, value, onChange, placeholder, autoComplete, required, minLength }) {
  const [show, setShow] = useState(false)
  return (
    <div className="login-input">
      <Lock className="login-input-icon" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
      />
      <button type="button" className="login-eye" onClick={() => setShow((s) => !s)} aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export default function LoginScreen() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [generation, setGeneration] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hasPassword, setHasPassword] = useState(null)
  const { data, loading, error } = useQuery(getMembers, [], { initialData: [] })
  const modeConfig = memberLoginMode
  const members = useMemo(() => {
    const list = data ?? []
    return modeConfig.roles?.length ? list.filter((m) => modeConfig.roles.includes(m.role)) : list
  }, [data])
  const generationOptions = useMemo(() => {
    const values = new Set(members.map((m) => String(m.generation ?? '').replace(/[^0-9]/g, '')).filter(Boolean))
    ;['1', '2', '3', '4', '5'].forEach((value) => values.add(value))
    return [...values].sort((a, b) => Number(a) - Number(b))
  }, [members])
  const selectedMember = useMemo(() => {
    const keyword = name.trim().toLocaleLowerCase()
    return members.find((m) => String(m.name ?? '').trim().toLocaleLowerCase() === keyword)
  }, [members, name])

  useEffect(() => {
    if (!selectedMember) { setHasPassword(null); return }
    setHasPassword(null)
    checkHasPassword(selectedMember.id).then(setHasPassword).catch(() => setHasPassword(false))
  }, [selectedMember?.id])

  const isFirstLogin = selectedMember && hasPassword === false
  const isCheckingPw = selectedMember && hasPassword === null

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setInfo('')
    setSubmitting(true)
    try {
      if (!selectedMember) throw new Error('회원 목록에서 일치하는 이름을 찾지 못했습니다. 이름을 정확히 입력하거나 목록에서 선택해 주세요.')
      if (isCheckingPw) throw new Error('계정 정보를 확인 중입니다. 잠시 후 다시 눌러 주세요.')
      let member
      if (isFirstLogin) {
        member = await Promise.race([
          loginFirstTime(name, school, generation, password, confirmPassword, { roles: modeConfig.roles }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB 연결을 확인해 주세요.')), 8000)),
        ])
      } else {
        member = await Promise.race([
          loginWithPassword(name, password, { roles: modeConfig.roles }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB 연결을 확인해 주세요.')), 8000)),
        ])
      }
      login(member)
      navigate(modeConfig.next)
    } catch (e) {
      setMessage(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="login-v2">
    <section className="login-v2-hero">
      <div className="login-v2-hero-copy">
        <h1>동아리 활동,<br />더 쉽게 <span className="accent">연결</span>하다</h1>
        <p>공모전 팀매칭부터 홍보 미션,<br />활동날씨까지 한 곳에서 관리하세요.</p>
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
      <h2>로그인</h2>
      <p className="login-v2-sub">이름과 기수로 본인 계정을 확인하고,<br />나의 활동과 팀매칭 현황을 확인하세요.</p>

      <form onSubmit={submit}>
        <div className="login-input">
          <UserRound className="login-input-icon" />
          <input list="member-names" value={name} onChange={(e) => { setName(e.target.value); setMessage(''); setInfo('') }} placeholder="이름을 입력하세요" autoComplete="name" required />
          <datalist id="member-names">{members.map((m) => <option key={m.id} value={m.name} />)}</datalist>
        </div>

        {isFirstLogin && <div className="login-input">
          <GraduationCap className="login-input-icon" />
          <select value={generation} onChange={(e) => setGeneration(e.target.value)} required>
            <option value="">기수를 선택하세요</option>
            {generationOptions.map((value) => <option key={value} value={value}>{value}기</option>)}
          </select>
        </div>}

        {isFirstLogin && <div className="login-input">
          <GraduationCap className="login-input-icon" />
          <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="학교명을 입력하세요" autoComplete="organization" required />
        </div>}

        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete={isFirstLogin ? 'new-password' : 'current-password'} minLength={4} required />

        {isFirstLogin && <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 한 번 더 입력" autoComplete="new-password" minLength={4} required />}

        {name.trim() && !selectedMember && !loading && <div className="login-v2-note warning">회원 목록에서 같은 이름을 찾지 못했어요. 이름을 정확히 입력해 주세요.</div>}
        {isCheckingPw && <div className="login-v2-note"><LoadingCloud size="small" text="계정 확인 중..." /></div>}
        {isFirstLogin && <div className="login-v2-note success">첫 로그인이에요. 학교·기수 확인 후 비밀번호를 설정하면 가입됩니다.</div>}
        {info && <div className="login-v2-note">{info}</div>}
        {message && <div className="login-v2-note error">{message}</div>}
        {error && <div className="login-v2-note error">{error.message}</div>}

        <button className="login-v2-submit" disabled={submitting || isCheckingPw}>
          {submitting ? <LoadingCloud size="small" text="확인 중..." /> : <>{isFirstLogin ? '비밀번호 설정 후 로그인' : '로그인'} <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="login-v2-divider"><span>또는</span></div>

      <Link className="login-v2-alt-btn solo" to="/admin-login">
        <ShieldCheck size={18} /> 관리자 로그인
      </Link>

      <button type="button" className="login-v2-forgot" onClick={() => { setMessage(''); setInfo('비밀번호 재설정은 운영진에게 문의해 주세요. 이름·기수 확인 후 초기화해 드립니다.') }}>
        비밀번호를 잊으셨나요?
      </button>
    </section>
  </main>
}
