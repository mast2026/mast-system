import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import AppLayout from './components/AppLayout'
import AdminLayout from './components/AdminLayout'
import LoginScreen from './screens/LoginScreen'
import AdminLoginScreen from './screens/AdminLoginScreen'
import HomeScreen from './screens/HomeScreen'
import PromotionLegacyScreen from './screens/PromotionLegacyScreen'
import AttendanceScreen from './screens/AttendanceScreen'
import ActivityWeatherScreen from './screens/ActivityWeatherScreen'
import WeatherPrototypeScreen from './screens/WeatherPrototypeScreen'
import PeerReviewPreviewScreen from './screens/PeerReviewPreviewScreen'
import ContestHomeScreen from './screens/ContestHomeScreen'
import ContestsScreen from './screens/ContestsScreen'
import ContestDetailScreen from './screens/ContestDetailScreen'
import TeamsScreen from './screens/TeamsScreen'
import TeamDetailScreen from './screens/TeamDetailScreen'
import CreateTeamScreen from './screens/CreateTeamScreen'
import ApplyTeamScreen from './screens/ApplyTeamScreen'
import TeamManagementScreen from './screens/TeamManagementScreen'
import TeamResultScreen from './screens/TeamResultScreen'
import PeerReviewScreen from './screens/PeerReviewScreen'
import LeaderApplicationScreen from './screens/LeaderApplicationScreen'
import ApplicationsScreen from './screens/ApplicationsScreen'
import MyTeamScreen from './screens/MyTeamScreen'
import AnnouncementsScreen from './screens/AnnouncementsScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import AdminDashboard from './screens/admin/AdminDashboard'
import AdminAttendanceScreen from './screens/admin/AdminAttendanceScreen'
import AdminPromotionScreen from './screens/admin/AdminPromotionScreen'
import AdminContestHubScreen from './screens/admin/AdminContestHubScreen'
import AdminActivityWeatherScreen from './screens/admin/AdminActivityWeatherScreen'
import AdminContestsScreen from './screens/admin/AdminContestsScreen'
import AdminLeaderApplicationsScreen from './screens/admin/AdminLeaderApplicationsScreen'
import AdminMembersScreen from './screens/admin/AdminMembersScreen'
import AdminTeamsScreen from './screens/admin/AdminTeamsScreen'
import AdminApplicationsScreen from './screens/admin/AdminApplicationsScreen'
import AdminAnnouncementsScreen from './screens/admin/AdminAnnouncementsScreen'
import AdminNotificationsScreen from './screens/admin/AdminNotificationsScreen'
import AdminPeerReviewsScreen from './screens/admin/AdminPeerReviewsScreen'
import AdminAwardsScreen from './screens/admin/AdminAwardsScreen'
import AdminLeaveRequestsScreen from './screens/admin/AdminLeaveRequestsScreen'

function MemberRoute() {
  const { member } = useAuth() || {}
  return member ? <AppLayout /> : <Navigate to="/login" replace />
}

function AdminRoute() {
  const { member, canAccessAdmin } = useAuth() || {}
  if (!member) return <Navigate to="/admin-login" replace />
  return canAccessAdmin ? <AdminLayout /> : <Navigate to="/" replace />
}

function LoginEntry() {
  const { member, canAccessAdmin } = useAuth() || {}
  if (!member) return <LoginScreen />
  return <Navigate to={canAccessAdmin ? '/admin' : '/'} replace />
}

function AdminLoginEntry() {
  const { member, canAccessAdmin } = useAuth() || {}
  if (!member) return <AdminLoginScreen />
  return <Navigate to={canAccessAdmin ? '/admin' : '/'} replace />
}

// 루트("/") 진입 시 관리자(운영진/지도교수)는 관리자 콘솔로 보냅니다.
function HomeEntry() {
  const { canAccessAdmin } = useAuth() || {}
  return canAccessAdmin ? <Navigate to="/admin" replace /> : <HomeScreen />
}

// 관리자(/admin) 화면에선 관리자용 매니페스트로 바꿔, 홈 화면 추가 시 별도 앱으로 설치되게 함
function ManifestSwitcher() {
  const location = useLocation()
  useEffect(() => {
    const isAdmin = location.pathname.startsWith('/admin')
    const link = document.getElementById('app-manifest')
    if (link) link.setAttribute('href', isAdmin ? '/manifest-admin.json' : '/manifest.json')
    const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (titleMeta) titleMeta.setAttribute('content', isAdmin ? 'MAST 관리자' : 'MAST')
  }, [location.pathname])
  return null
}

function AppRoutes() {
  return <><ManifestSwitcher /><Routes>
    <Route path="/login" element={<LoginEntry />} />
    <Route path="/admin-login" element={<AdminLoginEntry />} />

    <Route element={<MemberRoute />}>
      <Route index element={<HomeEntry />} />
      <Route path="promotion" element={<PromotionLegacyScreen />} />
      <Route path="attendance" element={<AttendanceScreen />} />
      <Route path="activity-weather" element={<ActivityWeatherScreen />} />
      <Route path="weather-prototype" element={<WeatherPrototypeScreen />} />
      <Route path="peer-review-preview" element={<PeerReviewPreviewScreen />} />
      <Route path="contests" element={<ContestHomeScreen />} />
      <Route path="contests/list" element={<ContestsScreen />} />
      <Route path="contests/:id" element={<ContestDetailScreen />} />
      <Route path="teams" element={<TeamsScreen />} />
      <Route path="teams/new" element={<CreateTeamScreen />} />
      <Route path="teams/:id" element={<TeamDetailScreen />} />
      <Route path="teams/:id/apply" element={<ApplyTeamScreen />} />
      <Route path="teams/:id/manage" element={<TeamManagementScreen />} />
      <Route path="teams/:id/applicants" element={<TeamManagementScreen />} />
      <Route path="teams/:id/result" element={<TeamResultScreen />} />
      <Route path="teams/:id/peer-review" element={<PeerReviewScreen />} />
      <Route path="leader-application" element={<LeaderApplicationScreen />} />
      <Route path="applications" element={<ApplicationsScreen />} />
      <Route path="my/applications" element={<ApplicationsScreen />} />
      <Route path="my-team" element={<MyTeamScreen />} />
      <Route path="my/teams" element={<MyTeamScreen />} />
      <Route path="announcements" element={<AnnouncementsScreen />} />
      <Route path="notifications" element={<NotificationsScreen />} />
    </Route>

    <Route path="admin" element={<AdminRoute />}>
      <Route index element={<AdminDashboard />} />
      <Route path="attendance" element={<AdminAttendanceScreen />} />
      <Route path="promotion" element={<AdminPromotionScreen />} />
      <Route path="contest" element={<AdminContestHubScreen />} />

      <Route path="contests" element={<AdminContestsScreen />} />
      <Route path="leader-applications" element={<AdminLeaderApplicationsScreen />} />
      <Route path="teams" element={<AdminTeamsScreen />} />
      <Route path="teams/:id/result" element={<TeamResultScreen />} />
      <Route path="teams/:id/peer-review" element={<PeerReviewScreen />} />
      <Route path="applications" element={<AdminApplicationsScreen />} />
      <Route path="members" element={<AdminMembersScreen />} />
      <Route path="announcements" element={<AdminAnnouncementsScreen />} />
      <Route path="notifications" element={<AdminNotificationsScreen />} />
      <Route path="notices" element={<Navigate to="/admin/announcements" replace />} />
      <Route path="activity-weather" element={<AdminActivityWeatherScreen />} />
      <Route path="peer-reviews" element={<AdminPeerReviewsScreen />} />
      <Route path="awards" element={<AdminAwardsScreen />} />
      <Route path="leave-requests" element={<AdminLeaveRequestsScreen />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></>
}

export default function App() {
  return <AppErrorBoundary><AuthProvider><AppRoutes /></AuthProvider></AppErrorBoundary>
}
