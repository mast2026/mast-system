import { useEffect, useState } from 'react'
import { Bell, LogOut, Megaphone, ShieldCheck } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ensureNotificationPermission, startNotificationWatcher } from '../services/notificationService'
import BottomNav from './BottomNav'
import BrandLogo from './BrandLogo'

export default function AppLayout() {
  const { member, logout, isAdmin } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const isContestDetail = /^\/contests\/\d+/.test(location.pathname); const isStandalone = isContestDetail
  const [hasNew, setHasNew] = useState(false)

  // 로그인 후 알림 권한을 요청하고, 새 알림이 오면 브라우저 푸시로 띄웁니다.
  useEffect(() => {
    if (!member?.id) return undefined
    ensureNotificationPermission()
    const stop = startNotificationWatcher(member.id, { onNew: () => setHasNew(true) })
    return stop
  }, [member?.id])

  // 알림함을 열면 새 알림 표시를 해제합니다.
  useEffect(() => {
    if (location.pathname === '/notifications') setHasNew(false)
  }, [location.pathname])

  return <div className={`app-shell${isContestDetail?' contest-detail-shell':''}`}>{!isStandalone&&<header className="topbar"><Link className="brand mast-brand" to="/"><BrandLogo /></Link><div className="top-actions"><Link to="/announcements" aria-label="공지"><Megaphone /></Link><Link to="/notifications" aria-label="알림" className={`notif-bell${hasNew ? ' has-new' : ''}`}><Bell /></Link>{isAdmin && <Link to="/admin" aria-label="관리자"><ShieldCheck /></Link>}<button onClick={() => { logout(); navigate('/login') }} aria-label="로그아웃"><LogOut /></button></div></header>}<main className="app-main"><Outlet context={{ member }} /></main>{!isStandalone&&<BottomNav />}</div>
}
