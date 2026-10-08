import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { identifyPushUser, logoutPushUser, promptPushPermission } from '../services/pushService'
import { normalizeSections } from '../utils/adminSections'
import { supabase } from '../lib/supabase'
import { serverAuth } from '../services/serverAuthService'
import LoadingCloud from '../components/common/LoadingCloud'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [member, setMember] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const revision = useRef(0)
  const applyMember = (m) => { setMember(m); if (m) identifyPushUser(m) }
  const login = (m) => { revision.current++; applyMember(m); promptPushPermission() }
  const logout = () => {
    revision.current++
    setMember(null)
    logoutPushUser()
    localStorage.removeItem('team_matching_current_member')
    if (supabase) void supabase.auth.signOut({ scope: 'local' })
  }
  useEffect(() => {
    let cancelled = false
    localStorage.removeItem('team_matching_current_member')
    const restore = async () => {
      const seq = ++revision.current
      try {
        const session = supabase ? (await supabase.auth.getSession()).data.session : null
        const current = session ? (await serverAuth('me')).member : null
        if (!cancelled && seq === revision.current) applyMember(current)
      } catch {
        if (!cancelled && seq === revision.current) setMember(null)
      } finally { if (!cancelled) setInitializing(false) }
    }
    restore()
    const listener = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { revision.current++; setMember(null) }
      else if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) setTimeout(restore, 0)
    })
    return () => { cancelled = true; listener?.data.subscription.unsubscribe() }
  }, [])
  const isFullAdmin = ['admin', 'manager', 'professor'].includes(member?.role)
  const isProfessor = member?.role === 'professor'
  const adminSections = normalizeSections(member?.admin_sections)
  const isExecOperator = !isFullAdmin && adminSections.length > 0
  const value = useMemo(() => ({
    member, login, updateMember: applyMember, logout,
    isAdmin: isFullAdmin, isFullAdmin, isProfessor, isExecOperator,
    adminSections, canAccessAdmin: isFullAdmin || isExecOperator,
    canAccessSection: (key) => isFullAdmin || adminSections.includes(key),
  }), [member, isFullAdmin, isProfessor, isExecOperator, adminSections.join(',')])
  return <AuthContext.Provider value={value}>{initializing ? <LoadingCloud text="로그인 확인 중..." /> : children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
