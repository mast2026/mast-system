import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMember } from '../services/memberService'

const STORAGE_KEY = 'team_matching_current_member'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [member, setMember] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })
  const login = (nextMember) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMember)); setMember(nextMember) }
  const logout = () => { localStorage.removeItem(STORAGE_KEY); setMember(null) }
  useEffect(() => { if (member?.id) getMember(member.id).then((latest) => latest && login(latest)).catch(() => {}) }, [member?.id])
  const isAdmin = ['admin', 'manager', 'professor'].includes(member?.role)
  const isProfessor = member?.role === 'professor'
  const value = useMemo(() => ({ member, login, updateMember: login, logout, isAdmin, isProfessor, canAccessAdmin: isAdmin || isProfessor }), [member, isAdmin, isProfessor])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
