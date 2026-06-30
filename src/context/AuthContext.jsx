import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMember } from '../services/memberService'
import { identifyPushUser, logoutPushUser, promptPushPermission } from '../services/pushService'
import { normalizeSections } from '../utils/adminSections'

const STORAGE_KEY = 'team_matching_current_member'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [member, setMember] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })
  // 저장+상태+푸시구독연결 (프롬프트는 띄우지 않음)
  const applyMember = (nextMember) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMember))
    setMember(nextMember)
    identifyPushUser(nextMember)
  }
  // 명시적 로그인: 푸시 구독 연결 + 허용 요청(앱을 닫아도 알림 받기)
  const login = (nextMember) => { applyMember(nextMember); promptPushPermission() }
  const logout = () => { logoutPushUser(); localStorage.removeItem(STORAGE_KEY); setMember(null) }
  useEffect(() => { if (member?.id) { identifyPushUser(member); getMember(member.id).then((latest) => latest && applyMember(latest)).catch(() => {}) } }, [member?.id])
  const isFullAdmin = ['admin', 'manager', 'professor'].includes(member?.role)
  const isProfessor = member?.role === 'professor'
  const adminSections = normalizeSections(member?.admin_sections)
  // 임원진(직책별 권한): 전체 관리자는 아니지만 일부 섹션 권한을 가진 회원
  const isExecOperator = !isFullAdmin && adminSections.length > 0
  const canAccessAdmin = isFullAdmin || isExecOperator
  const value = useMemo(() => ({
    member, login, updateMember: applyMember, logout,
    isAdmin: isFullAdmin, isFullAdmin, isProfessor, isExecOperator,
    adminSections, canAccessAdmin,
    // 특정 섹션 접근 가능 여부 (전체 관리자면 항상 true)
    canAccessSection: (key) => isFullAdmin || adminSections.includes(key),
  }), [member, isFullAdmin, isProfessor, isExecOperator, adminSections.join(',')])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
