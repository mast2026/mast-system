import { ArrowRight, Bell, CalendarDays, Megaphone, ShieldCheck, Trophy, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { getAdminDashboardData } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import operationCenterHero from '../../assets/admin/operation-center-hero.webp'

export default function AdminDashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const q = useQuery(getAdminDashboardData, [])
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const { stats } = q.data
  const cards = [
    ['출석 관리', '출석 시스템 관리자 페이지', '/admin/attendance', CalendarDays, 'blue'],
    ['홍보 관리', '홍보 관리자 페이지', '/admin/promotion', Megaphone, 'orange'],
    ['공모전 관리', '공모전 관리 페이지', '/admin/contest', Trophy, 'violet'],
    ['회원 관리', '회원 정보와 활동 내역 관리', '/admin/members', UsersRound, 'green'],
  ]
  const tasks = [
    ['공지 작성', null, '회원 홈 배너와 공지/알림을 등록하세요.', '/admin/announcements', Bell, 'yellow'],
    ['출석 모임 확인', stats.attendanceOpenSessions, '오늘 또는 예정된 모임과 출석 코드를 확인하세요.', '/admin/attendance', CalendarDays, 'blue'],
    ['홍보 미제출자 확인', stats.promotionMissing, '오늘 홍보 배정 중 미제출자를 확인하세요.', '/admin/promotion?tab=missing', Megaphone, 'orange'],
    ['공모전 팀장 신청 대기', stats.pendingLeaderApplications, '공모전별 팀 공고 작성 요청을 확인하세요.', '/admin/contest?tab=leader-applications', ShieldCheck, 'red'],
  ]
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

    <section className="admin-system-cards" aria-label="관리자 주요 메뉴">
      {cards.map(([label, caption, to, Icon, tone]) => <Link to={to} className={`tone-${tone}`} key={label}>
        <Icon />
        <div><b>{label}</b><small>{caption}</small></div>
        <span>이동 <ArrowRight /></span>
      </Link>)}
    </section>

    <div className="admin-dashboard-grid admin-dashboard-main admin-dashboard-simple">
      <section className="admin-panel todo-panel">
        <header><h2>오늘 처리할 업무</h2><Badge value={taskTotal} /></header>
        <div className="todo-list">
          {tasks.map(([label, count, text, to, Icon, tone]) => <Link to={to} key={label} className={`todo-row tone-${tone}`}>
            <span><Icon /></span>
            <div><b>{label}</b><small>{text}</small></div>
            <strong className={count ? '' : 'is-done'}>{count === null ? '작성' : count > 0 ? count : '완료'}</strong>
            <ArrowRight />
          </Link>)}
        </div>
      </section>
    </div>
  </>
}
