import { ArrowRight, Award, Bell, CalendarDays, LogOut as LeaveIcon, Megaphone, ShieldCheck, Trophy, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { getAdminDashboardData, getLeaveRequestCount } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import operationCenterHero from '../../assets/admin/operation-center-hero.webp'

export default function AdminDashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const q = useQuery(getAdminDashboardData, [])
  const leaveQuery = useQuery(getLeaveRequestCount, [], { initialData: 0 })
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const { stats } = q.data
  const leaveCount = Number(leaveQuery.data || 0)
  const cards = [
    ['출석 관리', '출석 시스템 관리자 페이지', '/admin/attendance', CalendarDays, 'blue'],
    ['홍보 관리', '홍보 관리자 페이지', '/admin/promotion', Megaphone, 'orange'],
    ['공모전 관리', '공모전 관리 페이지', '/admin/contest', Trophy, 'violet'],
    ['회원 관리', '회원 정보와 활동 내역 관리', '/admin/members', UsersRound, 'green'],
    ['수상 내역', '공모전 수상 기록 모아보기', '/admin/awards', Award, 'yellow'],
    ['공지 작성', '회원 홈 배너·공지/알림 등록', '/admin/announcements', Bell, 'red'],
  ]
  // 오늘 처리할 업무 — 해당될 때만(있을 때만) 노출
  const tasks = [
    !stats.hasTodayPromotionMission && ['홍보 미션 등록하기', null, '오늘 홍보 미션을 등록하세요.', '/admin/promotion', Megaphone, 'orange'],
    ['공모전 등록하기', null, '새 공모전을 등록하세요.', '/admin/contest', Trophy, 'violet'],
    ['홍보 미제출자 알림 보내기', stats.promotionMissing, '미제출 대상자에게 알림을 보내세요.', '/admin/promotion?tab=missing', Bell, 'orange'],
    stats.pendingLeaderApplications > 0 && ['공모전 팀장 신청', stats.pendingLeaderApplications, '팀 공고 작성 요청을 확인하세요.', '/admin/contest?tab=leader-applications', ShieldCheck, 'red'],
    stats.pendingApplications > 0 && ['팀매칭 신청', stats.pendingApplications, '회원들의 팀 지원을 확인하세요.', '/admin/applications', UsersRound, 'blue'],
    leaveCount > 0 && ['팀 탈퇴 신청', leaveCount, '팀원이 신청한 탈퇴를 승인/반려하세요.', '/admin/leave-requests', LeaveIcon, 'red'],
  ].filter(Boolean)
  const taskTotal = tasks.reduce((sum, item) => sum + Math.max(0, Number(item[1] || 0)), 0)
  return <>
    <section className="admin-dashboard-actions">
      <div>
        <b>관리자 메인</b>
        <span>시스템 운영 기능을 선택하세요.</span>
      </div>
      <button type="button" onClick={() => { logout(); navigate('/admin-login') }}>로그아웃</button>
    </section>

    <section className="admin-hero">
      <div>
        <span className="admin-kicker">MAST ADMIN</span>
        <h1>운영센터</h1>
        <p>출석, 홍보, 공모전 팀매칭, 평가, 활동날씨를 한 화면에서 관리합니다.</p>
      </div>
      <img className="admin-hero-image" src={operationCenterHero} alt="" aria-hidden="true" />
    </section>

    <div className="admin-dashboard-grid admin-dashboard-main admin-dashboard-simple">
      <section className="admin-panel todo-panel">
        <header><h2>오늘 처리할 업무</h2><Badge value={taskTotal} /></header>
        <div className="todo-list">
          {tasks.map(([label, count, text, to, Icon, tone]) => <Link to={to} key={label} className={`todo-row tone-${tone}`}>
            <span><Icon /></span>
            <div><b>{label}</b><small>{text}</small></div>
            <strong className={count ? '' : 'is-done'}>{count === null ? '등록' : count > 0 ? count : '완료'}</strong>
            <ArrowRight />
          </Link>)}
        </div>
      </section>
    </div>

    <section className="admin-system-cards" aria-label="관리자 주요 메뉴">
      {cards.map(([label, caption, to, Icon, tone]) => <Link to={to} className={`tone-${tone}`} key={label}>
        <Icon />
        <div><b>{label}</b><small>{caption}</small></div>
        <span>이동 <ArrowRight /></span>
      </Link>)}
    </section>
  </>
}
