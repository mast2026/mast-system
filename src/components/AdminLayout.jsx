import { useEffect, useState } from 'react'
import { Award, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, CloudSun, FileText, Home, LayoutDashboard, LogOut, Megaphone, MessageSquareText, ShieldCheck, Trophy, Users } from 'lucide-react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canAccessAdminPath, sectionKeyForPath } from '../utils/adminSections'
import BrandLogo from './BrandLogo'
const adminNavGroups = [
  { label: '홈', items: [['/admin', LayoutDashboard, '대시보드']] },
  { label: '통합 시스템', items: [['/admin/attendance', CalendarDays, '출석 관리'], ['/admin/promotion', Megaphone, '홍보 관리'], ['/admin/contest', Trophy, '공모전 관리']] },
  { label: '공모전 세부', items: [['/admin/leader-applications', ShieldCheck, '팀장 신청'], ['/admin/teams', ClipboardList, '팀 관리'], ['/admin/applications', FileText, '지원서 관리']] },
  { label: '회원/소통', items: [['/admin/members', Users, '회원 관리'], ['/admin/announcements', Megaphone, '공지 관리'], ['/admin/notifications', Bell, '알림 관리']] },
  { label: '평가/성과', items: [['/admin/activity-weather', CloudSun, '활동날씨'], ['/admin/peer-reviews', MessageSquareText, '동료평가'], ['/admin/awards', Award, '수상 관리']] },
]
export default function AdminLayout() {
  const { member, logout, isFullAdmin, adminSections } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  // 직책별 권한: 임원진은 허용된 섹션 메뉴만 보이고, 그 외 경로는 대시보드로 되돌립니다.
  const allowPath = (to) => isFullAdmin || to === '/admin' || (adminSections || []).includes(sectionKeyForPath(to))
  const visibleGroups = adminNavGroups
    .map((group) => ({ ...group, items: group.items.filter(([to]) => allowPath(to)) }))
    .filter((group) => group.items.length)
  const [topCollapsed, setTopCollapsed] = useState(() => localStorage.getItem('mast_admin_top_expanded') !== 'true')
  const [sideCollapsed, setSideCollapsed] = useState(() => localStorage.getItem('mast_admin_side_collapsed') === 'true')
  const isPromotionAdmin = location.pathname.startsWith('/admin/promotion')
  const roleLabel = member?.role === 'professor' ? '교수' : (!isFullAdmin && member?.position_title) ? member.position_title : '관리자'
  const toggleTop = () => {
    const next = !topCollapsed; setTopCollapsed(next)
    localStorage.setItem('mast_admin_top_expanded', String(!next))
  }
  const toggleSide = () => {
    const next = !sideCollapsed; setSideCollapsed(next)
    localStorage.setItem('mast_admin_side_collapsed', String(next))
  }
  useEffect(() => { if (localStorage.getItem('mast_admin_top_expanded') === null) setTopCollapsed(true) }, [])
  // 권한 없는 섹션 직접 진입 차단 (임원진)
  if (!canAccessAdminPath(adminSections, location.pathname, isFullAdmin)) return <Navigate to="/admin" replace />
  if (isPromotionAdmin) {
    return <main className="admin-promotion-standalone"><Outlet /></main>
  }
  return <div className={`admin-shell ${topCollapsed ? 'admin-top-collapsed' : ''} ${sideCollapsed ? 'admin-side-collapsed' : ''} ${isPromotionAdmin ? 'admin-promotion-route' : ''}`}>
    <aside className="admin-sidebar">
      {!sideCollapsed && <div className="admin-brand">
        <BrandLogo size="admin" light/>
        <small>MAST 관리자 콘솔</small>
      </div>}
      {sideCollapsed && <div className="admin-brand admin-brand-mini"><BrandLogo size="admin" light/></div>}
      <nav className="admin-nav">
        {visibleGroups.map((group) => <section key={group.label}>
          {!sideCollapsed && <p>{group.label}</p>}
          {group.items.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} end={to === '/admin'} title={sideCollapsed ? label : undefined}>
              <Icon />{!sideCollapsed && label}
            </NavLink>
          ))}
        </section>)}
      </nav>
      {!sideCollapsed && <button className="admin-user" onClick={() => { logout(); navigate('/admin-login') }}>
        <span><Home /></span>
        <div><b>{member?.name}</b><small>{roleLabel} · 로그아웃</small></div>
        <LogOut />
      </button>}
      <button className="admin-side-toggle" onClick={toggleSide} aria-label={sideCollapsed ? '사이드바 펼치기' : '사이드바 접기'}>
        {sideCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar">
        <div>
          <strong>MAST 관리자 콘솔</strong>
          <span>출석 · 홍보 · 공모전 통합 운영</span>
        </div>
        <div className="admin-top-actions">
          {location.pathname !== '/admin' && <button type="button" className="admin-collapse-button" onClick={() => navigate('/admin')} aria-label="관리자 메인으로 이동">
            <LayoutDashboard />
            <span>관리자 메인</span>
          </button>}
          <button type="button" className="admin-collapse-button" onClick={toggleTop} aria-label={topCollapsed ? '상단 펼치기' : '상단 접기'}>
            {topCollapsed ? <ChevronDown /> : <ChevronUp />}
            <span>{topCollapsed ? '펼치기' : '접기'}</span>
          </button>
          <button type="button" aria-label="알림"><Bell /><em>3</em></button>
          <div className="admin-profile-chip"><span>{String(member?.name ?? 'M').slice(0, 1)}</span><div><b>{member?.name}</b><small>{roleLabel}</small></div></div>
        </div>
      </header>
      <Outlet />
    </main>
  </div>
}
