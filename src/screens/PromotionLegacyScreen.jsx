import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MemberApp } from '../EtaPromotionLegacy.jsx'
import LoadingCloud from '../components/common/LoadingCloud'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const normalizeText = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '')
const normalizeGeneration = (value) => String(value ?? '').replace(/[^0-9]/g, '')

function isSameSchool(input, saved) {
  const a = normalizeText(input)
  const b = normalizeText(saved)
  if (!a || !b) return true
  return a.includes(b) || b.includes(a)
}

function isSameGeneration(input, saved) {
  const a = normalizeGeneration(input)
  const b = normalizeGeneration(saved)
  if (!a || !b) return true
  return a === b
}

async function findPromotionMember(currentMember) {
  if (!supabase || !currentMember?.name) return null

  if (currentMember.mast_member_id) {
    const { data } = await supabase
      .from('members')
      .select('id,name,gi,school,major,email,role,status')
      .eq('id', currentMember.mast_member_id)
      .maybeSingle()
    if (data) return data
  }

  const { data, error } = await supabase
    .from('members')
    .select('id,name,gi,school,major,email,role,status')
    .eq('name', currentMember.name)
    .order('id', { ascending: true })

  if (error) throw error

  const activeRows = (data ?? []).filter((row) => (row.status ?? 'active') === 'active')
  return activeRows.find((row) => (
    isSameSchool(currentMember.school, row.school)
    && isSameGeneration(currentMember.generation, row.gi)
  )) ?? activeRows[0] ?? null
}

export default function PromotionLegacyScreen() {
  const { member } = useAuth()
  const [promotionMember, setPromotionMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    findPromotionMember(member)
      .then((data) => {
        if (!alive) return
        setPromotionMember(data)
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message || '홍보 시스템 회원 정보를 불러오지 못했어요.')
      })
      .finally(() => alive && setLoading(false))

    return () => { alive = false }
  }, [member])

  const session = useMemo(() => {
    if (!promotionMember) return null
    return { member: promotionMember, role: promotionMember.role === 'admin' ? 'admin' : 'member' }
  }, [promotionMember])

  if (loading) {
    return <LoadingCloud fullScreen text="홍보 시스템을 연결하는 중..." />
  }

  if (error || !session) {
    return (
      <main className="promotion-link-state">
        <div className="promotion-link-card">
          <h1>홍보 시스템 회원 연결 필요</h1>
          <p>
            통합 로그인 회원 정보와 기존 홍보 시스템의 회원 명단을 매칭하지 못했어요.
            이름, 학교, 기수가 기존 홍보 DB의 members 테이블과 같은지 확인해 주세요.
          </p>
          {error && <p className="promotion-link-error">{error}</p>}
          <Link to="/" className="primary-button">홈으로 돌아가기</Link>
        </div>
      </main>
    )
  }

  return <MemberApp session={session} onLogout={() => {}} embedded />
}
