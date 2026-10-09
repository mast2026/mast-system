import wordmark from '../assets/mast-wordmark.svg'
import './auth-entry.css'

export default function AuthEntry({ title, description, children }) {
  return <main className="auth-entry">
    <div className="auth-shell">
      <header className="auth-brand">
        <img src={wordmark} alt="MAST" className="auth-wordmark" />
        <p className="auth-brand-caption">대학생 연합 동아리</p>
        <div className="auth-brand-details">
          <h2>함께하는 MAST 활동</h2>
          <p>공모전 팀을 찾고, 홍보 미션을 인증하고,<br />나의 활동 현황을 확인하세요.</p>
        </div>
      </header>
      <section className="auth-content" aria-labelledby="auth-title">
        <h1 id="auth-title">{title}</h1>
        {description && <p className="auth-description">{description}</p>}
        {children}
      </section>
    </div>
  </main>
}
