import { useState } from 'react'
import { ArrowRight, Award, Bell, CalendarDays, CheckCircle2, LogOut as LeaveIcon, Megaphone, Send, ShieldCheck, Trophy, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { getAdminDashboardData, getLeaveRequestCount } from '../../services/adminService'
import { notifyPromotionTargets } from '../../services/notificationService'
import { useAuth } from '../../context/AuthContext'
import operationCenterHero from '../../assets/admin/operation-center-hero.webp'

export default function AdminDashboard() {
  const { logout, canAccessSection } = useAuth()
  const navigate = useNavigate()
  const q = useQuery(getAdminDashboardData, [])
  const leaveQuery = useQuery(getLeaveRequestCount, [], { initialData: 0 })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  const { stats } = q.data
  const leaveCount = Number(leaveQuery.data || 0)

  const sendPromotionAlert = async () => {
    setBusy(true); setNotice('')
    try {
      const r = await notifyPromotionTargets()
      setNotice(`홍보 미제출자 ${r.sent}명에게 알림을 보냈어요.${r.unmatched?.length ? ` (계정 미연결 ${r.unmatched.length}명 제외)` : ''}`)
    } catch (e) {
      setNotice(e.message)
    } finally {
      setBusy(false)
    }
  }
  const cards = [
    ['출석 관리', '출석 시스템 관리자 페이지', '/admin/attendance', CalendarDays, 'blue', 'attendance'],
    ['홍보 관리', '홍보 관리자 페이지', '/admin/promotion', Megaphone, 'orange', 'promotion'],
    ['공모전 관리', '공모전 관리 페이지', '/admin/contest', Trophy, 'violet', 'contest'],
    ['회원 관리', '회원 정보와 활동 내역 관리', '/admin/members', UsersRound, 'green', 'members'],
    ['수상 내역', '공모전 수상 기록 모아보기', '/admin/awards', Award, 'yellow', 'evaluation'],
    ['공지 작성', '회원 홈 배너·공지/알림 등록', '/admin/announcements', Bell, 'red', 'notice'],
  ].filter((c) => canAccessSection(c[5]))
  // 오늘 처리할 업무 — 주로 하는 동작 버튼. action 이 있으면 바로 실행, 없으면 페이지로 이동.
  const tasks = [
    !stats.hasTodayPromotionMission && { section: 'promotion', label: '홍보 미션 등록하기', cta: '등록', text: '오늘 홍보 미션을 등록하세요.', to: '/admin/promotion', Icon: Megaphone, tone: 'orange' },
    { section: 'contest', label: '공모전 등록하기', cta: '등록', text: '새 공모전을 등록하세요.', to: '/admin/contest', Icon: Trophy, tone: 'violet' },
    { section: 'promotion', label: '홍보 미제출자 알림 보내기', count: stats.promotionMissing, cta: '보내기', text: '버튼 한 번으로 미제출자 전원에게 알림 발송.', action: sendPromotionAlert, Icon: Send, tone: 'orange' },
    stats.promotionPending > 0 && { section: 'promotion', label: '홍보 인증 승인', count: stats.promotionPending, cta: '승인', text: '제출된 홍보 인증을 승인하세요.', to: '/admin/promotion?tab=certs', Icon: CheckCircle2, tone: 'green' },
    stats.pendingLeaderApplications > 0 && { section: 'contest', label: '공모전 팀장 신청', count: stats.pendingLeaderApplications, cta: '확인', text: '팀 공고 작성 요청을 확인하세요.', to: '/admin/contest?tab=leader-applications', Icon: ShieldCheck, tone: 'red' },
    stats.pendingApplications > 0 && { section: 'contest', label: '팀매칭 신청', count: stats.pendingApplications, cta: '확인', text: '회원들의 팀 지원을 확인하세요.', to: '/admin/applications', Icon: UsersRound, tone: 'blue' },
    leaveCount > 0 && { section: 'contest', label: '팀 탈퇴 신청', count: leaveCount, cta: '확인', text: '팀원이 신청한 탈퇴를 승인/반려하세요.', to: '/admin/leave-requests', Icon: LeaveIcon, tone: 'red' },
  ].filter(Boolean).filter((t) => canAccessSection(t.section))
  const taskTotal = tasks.reduce((sum, item) => sum + Math.max(0, Number(item.count || 0)), 0)
  const taskInner = (t) => <>
    <span><t.Icon /></span>
    <div><b>{t.label}</b></div>
    <strong className={t.count ? '' : 'is-done'}>{t.count == null ? (t.cta || '등록') : t.count > 0 ? t.count : '완료'}</strong>
    <ArrowRight />
  </>
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
        {notice && <div className="form-notice">{notice}</div>}
        <div className="todo-list">
          {tasks.map((t) => t.action
            ? <button type="button" key={t.label} className={`todo-row tone-${t.tone}`} disabled={busy} onClick={t.action}>{taskInner(t)}</button>
            : <Link to={t.to} key={t.label} className={`todo-row tone-${t.tone}`}>{taskInner(t)}</Link>)}
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
