import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { findMembersByName, loginFirstTime, loginWithPassword, verifyFirstLoginIdentity } from '../services/memberService'
import LoadingCloud from '../components/common/LoadingCloud'
import AuthEntry from '../components/AuthEntry'
import SchoolAutocomplete from '../components/SchoolAutocomplete'

const memberLoginMode = { label: '회원', roles: null, next: '/' }

function PasswordField({ id, value, onChange, placeholder, autoComplete, required }) {
  const [show, setShow] = useState(false)
  return (
    <div className="auth-input">
      <Lock className="login-input-icon" />
      <input
        id={id}
        aria-label={autoComplete === 'current-password' ? '비밀번호' : placeholder}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      <button type="button" className="auth-eye" onClick={() => setShow((s) => !s)} aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}>
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
  const [pickedId, setPickedId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [phone, setPhone] = useState('')
  const [identityVerified, setIdentityVerified] = useState(false)
  useEffect(() => {
    let cancelled = false
    setData([]); setError(null)
    if (name.trim().length < 2) { setLoading(false); return }
    setLoading(true)
    const timer = setTimeout(() => {
      findMembersByName(name).then(rows => { if (!cancelled) setData(rows) }).catch(e => { if (!cancelled) setError(e) }).finally(() => { if (!cancelled) setLoading(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [name])
  const modeConfig = memberLoginMode
  const members = useMemo(() => {
    const list = data ?? []
    return modeConfig.roles?.length ? list.filter((m) => modeConfig.roles.includes(m.role)) : list
  }, [data])
  const generationOptions = useMemo(() => {
    const values = new Set(members.map((m) => String(m.generation ?? '').replace(/[^0-9]/g, '')).filter(Boolean))
    ;['1', '2', '3'].forEach((value) => values.add(value))
    return [...values].sort((a, b) => Number(a) - Number(b))
  }, [members])
  const sameNameMembers = useMemo(() => {
    const keyword = name.trim().toLocaleLowerCase()
    return members.filter((m) => String(m.name ?? '').trim().toLocaleLowerCase() === keyword && String(m.generation ?? '').replace(/[^0-9]/g, '') === generation)
  }, [members, name, generation])
  const sameNameCount = sameNameMembers.length
  // 동명이인이면 드롭다운에서 고른 사람이 기준입니다.
  // (예전에는 무조건 id가 빠른 사람을 기준으로 삼아, 그 사람이 이미 비밀번호를 설정했으면
  //  같은 이름의 다른 회원이 첫 로그인을 할 수 없었습니다.)
  const needsPick = sameNameCount > 1 && !pickedId
  const selectedMember = useMemo(() => {
    if (pickedId) return sameNameMembers.find((m) => String(m.id) === String(pickedId)) ?? null
    return sameNameCount === 1 ? sameNameMembers[0] : null
  }, [sameNameMembers, sameNameCount, pickedId])

  const hasPassword = selectedMember ? selectedMember.has_password : null

  const isFirstLogin = selectedMember && hasPassword === false
  const isCheckingPw = selectedMember && hasPassword === null

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setInfo('')
    setSubmitting(true)
    try {
      if (!generation) throw new Error('기수를 선택해 주세요.')
      if (needsPick) throw new Error('같은 이름의 회원이 여러 명입니다. 본인 학교·기수를 먼저 선택해 주세요.')
      if (!selectedMember) throw new Error('회원 목록에서 일치하는 이름을 찾지 못했습니다. 이름을 정확히 입력하거나 목록에서 선택해 주세요.')
      if (isCheckingPw) throw new Error('계정 정보를 확인 중입니다. 잠시 후 다시 눌러 주세요.')
      const withTimeout = (p) => Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error('DB 연결을 확인해 주세요.')), 8000))])
      // 고른 회원으로 후보를 좁혀, 동명이인이 서로의 계정으로 로그인되는 것을 막습니다.
      const opts = { roles: modeConfig.roles, memberId: selectedMember.id, phone }
      if (isFirstLogin && !identityVerified) {
        await withTimeout(verifyFirstLoginIdentity({ name, school, generation, phone, memberId: selectedMember.id }))
        setIdentityVerified(true)
        return
      }
      const tryPassword = () => withTimeout(loginWithPassword(name, password, opts))
      const tryFirst = () => withTimeout(loginFirstTime(name, school, generation, password, confirmPassword, opts))
      let member
      try {
        member = isFirstLogin ? await tryFirst() : await tryPassword()
      } catch (e1) {
        // 동명이인 등으로 첫로그인/일반로그인 분기가 어긋난 경우 반대 경로도 시도
        if (/설정되지 않았/.test(e1.message) && school && generation) member = await tryFirst()
        else if (/이미 비밀번호가 설정/.test(e1.message)) member = await tryPassword()
        else throw e1
      }
      login(member)
      navigate(modeConfig.next)
    } catch (e) {
      setMessage(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthEntry title="로그인" description={isFirstLogin ? (identityVerified ? '확인이 끝났어요. 사용할 비밀번호를 설정해 주세요.' : '처음 로그인하는 계정이에요. 학교, 기수, 등록된 전화번호를 입력해 주세요.') : '이름, 기수와 비밀번호로 로그인해 주세요.'}>
      <form onSubmit={submit}>
        <div className="auth-input">
          <UserRound className="login-input-icon" />
          <input value={name} onChange={(e) => { setName(e.target.value); setIdentityVerified(false); setPhone(''); setPassword(''); setConfirmPassword(''); setPickedId(''); setSchool(''); setMessage(''); setInfo('') }} aria-label="이름" placeholder="이름을 입력하세요" autoComplete="off" required />
        </div>

        <div className="auth-input">
          <GraduationCap className="login-input-icon" />
          <select aria-label="기수" value={generation} onChange={(e) => {
            setGeneration(e.target.value); setPickedId(''); setSchool(''); setPhone(''); setIdentityVerified(false); setPassword(''); setConfirmPassword(''); setMessage('')
          }} required disabled={identityVerified}>
            <option value="">기수를 선택하세요</option>
            {generationOptions.map((value) => <option key={value} value={value}>{value}기</option>)}
          </select>
        </div>

        {sameNameCount > 1 ? <div className="auth-input">
          <GraduationCap className="login-input-icon" />
          <select aria-label="본인 학교·기수" value={pickedId} onChange={(e) => {
            setPickedId(e.target.value); setIdentityVerified(false); setPhone(''); setPassword(''); setConfirmPassword('')
            const m = sameNameMembers.find((x) => String(x.id) === e.target.value)
            if (m) { setSchool(m.school || ''); setGeneration(String(m.generation ?? '').replace(/[^0-9]/g, '')) }
          }} required>
            <option value="">본인 학교·기수를 선택하세요</option>
            {sameNameMembers.map((m) => <option key={m.id} value={m.id}>{(m.school || '학교 미정')} · {String(m.generation ?? '').replace(/[^0-9]/g, '') || '-'}기</option>)}
          </select>
        </div> : (isFirstLogin && <>
          <SchoolAutocomplete value={school} onChange={(value) => { setSchool(value); setIdentityVerified(false) }} disabled={identityVerified} />
        </>)}

        {isFirstLogin && <div className="auth-input"><UserRound className="login-input-icon" /><input aria-label="전화번호" value={phone} onChange={e => { setPhone(e.target.value); setIdentityVerified(false) }} type="tel" inputMode="tel" placeholder="전화번호 전체를 입력하세요" autoComplete="tel" disabled={identityVerified} required /></div>}

        {(!isFirstLogin || identityVerified) && !needsPick && <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete={isFirstLogin ? 'new-password' : 'current-password'} required />}

        {isFirstLogin && identityVerified && <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 한 번 더 입력" autoComplete="new-password" required />}

        {name.trim() && generation && !sameNameCount && !loading && <div className="auth-note warning">회원 목록에서 같은 이름을 찾지 못했어요. 이름을 정확히 입력해 주세요.</div>}
        {needsPick && <div className="auth-note">같은 이름의 회원이 여러 명이에요. 위에서 본인 학교·기수를 선택해 주세요.</div>}
        {isCheckingPw && <div className="auth-note"><LoadingCloud size="small" text="계정 확인 중..." /></div>}
        {isFirstLogin && identityVerified && <div className="auth-note success">사용할 비밀번호를 입력하고 한 번 더 확인해 주세요.</div>}
        {info && <div className="auth-note">{info}</div>}
        {message && <div className="auth-note error">{message}</div>}
        {error && <div className="auth-note error">{error.message}</div>}

        <button className="auth-button auth-button-primary" disabled={submitting || isCheckingPw}>
          {submitting ? <LoadingCloud size="small" text="확인 중..." /> : <>{isFirstLogin ? (identityVerified ? '비밀번호 설정 후 로그인' : '전화번호 확인') : '로그인'} <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="auth-actions">
      <Link className="auth-button auth-button-secondary" to="/reset-password">비밀번호를 잊으셨나요?</Link>

      <div className="auth-divider"><span>또는</span></div>

      <Link className="auth-button auth-button-secondary" to="/admin-login">
        <ShieldCheck size={18} /> 관리자 로그인
      </Link>
      </div>
  </AuthEntry>
}
