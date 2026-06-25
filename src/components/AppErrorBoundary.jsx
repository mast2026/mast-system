import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class AppErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('Recovered render error', error) }
  render() {
    if (!this.state.error) return this.props.children
    return <main className="fatal-state"><AlertTriangle/><h1>화면을 표시하지 못했어요</h1><p>데이터 형식이나 연결 상태가 일시적으로 불안정합니다. 새로고침하면 다시 시도합니다.</p><button className="button primary" onClick={() => window.location.reload()}><RefreshCw/>새로고침</button><button className="button secondary" onClick={() => { localStorage.removeItem('team_matching_current_member'); window.location.href = '/login' }}>로그인 화면으로</button></main>
  }
}
