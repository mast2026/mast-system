import { AlertCircle, Inbox } from 'lucide-react'
import LoadingCloud from './common/LoadingCloud'

export function LoadingState({ label = '데이터를 불러오고 있어요' }) {
  return <div className="state loading-state"><LoadingCloud size="medium" text={label} variant="weather" /></div>
}
export function ErrorState({ error, retry }) {
  const raw = error?.message || ''; const permission = /permission denied|401|row-level security/i.test(raw); const timeout = /시간이 초과|timeout/i.test(raw)
  const message = permission ? '현재 계정으로 볼 수 없는 데이터예요. 다른 화면은 계속 이용할 수 있습니다.' : timeout ? '서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.' : '연결 상태를 확인한 뒤 다시 시도해 주세요.'
  return <div className="state error"><AlertCircle /><strong>데이터를 불러오지 못했어요</strong><p>{message}</p>{retry && <button className="button secondary" onClick={retry}>다시 시도</button>}</div>
}
export function EmptyState({ title = '아직 등록된 내용이 없어요', description = '새로운 소식이 생기면 이곳에 표시됩니다.' }) {
  return <div className="state"><Inbox /><strong>{title}</strong><p>{description}</p></div>
}
