import { CalendarDays, Home, Megaphone, Trophy, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
const links = [['/', Home, '홈'], ['/promotion', Megaphone, '홍보'], ['/attendance', CalendarDays, '출석'], ['/contests', Trophy, '공모전'], ['/activity-weather', UserRound, '내활동']]
export default function BottomNav() {
  return <nav className="bottom-nav">{links.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}</nav>
}
