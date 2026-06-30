import { AdminApp } from '../../EtaPromotionLegacy.jsx'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'

const tabMap = {
  legacy: 'dashboard',
  dashboard: 'dashboard',
  home: 'dashboard',
  mission: 'mission',
  missions: 'mission',
  members: 'members',
  schools: 'members',
  submissions: 'certs',
  certs: 'certs',
  missing: 'uncert',
  uncert: 'uncert',
  history: 'history',
}

export default function AdminPromotionScreen() {
  const { member, logout, isFullAdmin } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialTab = tabMap[params.get('tab')] || 'dashboard'
  const legacySession = {
    role: 'admin',
    member: {
      id: member?.mast_member_id || member?.id,
      name: member?.name,
      school: member?.school,
      gi: member?.generation,
      role: 'admin',
    },
  }

  return <section className="admin-promotion-only">
    <AdminApp session={legacySession} onLogout={logout} onExitToAdmin={() => navigate(isFullAdmin ? '/admin' : '/')} embedded initialTab={initialTab} />
  </section>
}
