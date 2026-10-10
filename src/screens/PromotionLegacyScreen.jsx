import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MemberApp } from '../EtaPromotionLegacy.jsx'
import LoadingCloud from '../components/common/LoadingCloud'
import { useAuth } from '../context/AuthContext'
import { findPromotionMember } from '../services/promotionService'

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
  }, [member?.id, member?.mast_member_id])

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
          <p>{error ? '홍보 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : '홍보 회원 정보를 찾지 못했어요. 운영진에게 문의해 주세요.'}</p>
          <Link to="/" className="primary-button">홈으로 돌아가기</Link>
        </div>
      </main>
    )
  }

  return <MemberApp session={session} onLogout={() => {}} embedded />
}
