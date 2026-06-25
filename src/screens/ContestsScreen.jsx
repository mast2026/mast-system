import { ExternalLink } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import Badge from '../components/Badge'
import { ErrorState, LoadingState, EmptyState } from '../components/States'
import useQuery from '../hooks/useQuery'
import { getActiveContests } from '../services/contestService'
import { formatDate, pick, safeHttpUrl } from '../utils/display'

const CLOSED_PREVIEW_CONTESTS = [
  {
    id: 'preview-closed-1',
    title: '제10회 디지털 헬스케어 MEDICAL HACK 2026',
    organizer: '부산광역시 · 부산대학교 · 부산대학교병원',
    prize: '부산광역시장상 300만원',
    category: '아이디어·창업·마케팅·네이밍',
    registration_deadline: '2026-06-01',
    presentation_date: '2026-06-18',
    max_team_size: 5,
    link: '',
    status: 'closed',
    previewNotice: '접수가 마감된 공모전 예시입니다. 결과 등록 후 동료평가 흐름을 확인하는 용도예요.',
  },
  {
    id: 'preview-closed-2',
    title: '공공데이터 활용 서비스 아이디어 공모전',
    organizer: 'MAST 운영진 테스트',
    prize: '최우수상 100만원',
    category: '공공데이터·서비스 기획',
    registration_deadline: '2026-05-20',
    presentation_date: '2026-06-05',
    max_team_size: 6,
    link: '',
    status: 'finished',
    previewNotice: '결과 발표까지 지난 완료 상태 예시입니다.',
  },
]

export default function ContestsScreen() {
  const [searchParams] = useSearchParams()
  const previewMode = searchParams.get('preview')
  const isClosedPreview = previewMode === 'closed'
  const q = useQuery(getActiveContests, [])
  const contests = isClosedPreview ? CLOSED_PREVIEW_CONTESTS : q.data
  return <>
    <section className="contest-main-hero">
      <div>
        <span>MAST CONTEST</span>
        <h1>{isClosedPreview ? '마감 공모전' : '공모전'}</h1>
        <p>{isClosedPreview ? '접수 마감 이후 회원 화면 상태를 확인합니다.' : '진행 중인 공모전을 확인하고 함께할 팀을 찾아보세요.'}</p>
      </div>
      <img src="/assets/hero/contest-hero.webp" alt="" aria-hidden="true" />
    </section>
    {isClosedPreview && <section className="developer-weather-panel contest-preview-panel">
      <div>
        <b>마감 상태 프리뷰</b>
        <span>실제 DB 데이터가 아니라 화면 확인용입니다.</span>
      </div>
      <Link className="button secondary small" to="/weather-prototype">프로토타입으로 돌아가기</Link>
    </section>}
    {!isClosedPreview && q.loading ? <LoadingState /> : !isClosedPreview && q.error ? <ErrorState error={q.error} retry={q.retry} /> : !contests.length ? <EmptyState title="현재 모집 중인 공모전이 없습니다." /> : <div className="card-list">
      {contests.map((contest) => {
        const officialUrl = safeHttpUrl(contest.link)
        const isClosed = ['closed', 'finished'].includes(contest.status)
        return <article className="entity-card contest-card" key={contest.id}>
          <div className="card-heading">
            <h3>{contest.title}</h3>
            <Badge value={isClosed ? contest.status : 'open'} />
          </div>
          <p className="contest-organizer">{contest.organizer || '주최 기관 미정'}</p>
          {contest.previewNotice && <p className="contest-preview-note">{contest.previewNotice}</p>}
          <div className="contest-facts">
            <span>🏆 {contest.prize || '상금 정보 없음'}</span>
            <span>📂 {contest.category || '분야 미정'}</span>
            <span>📅 마감 {formatDate(contest.registration_deadline)}</span>
            {contest.presentation_date && <span>📣 발표 {formatDate(contest.presentation_date)}</span>}
            <span>👥 최대 {pick(contest, ['max_team_size'], '-')}명</span>
          </div>
          <div className="contest-actions">
            {isClosed ? <button className="button secondary" disabled>접수 마감</button> : <Link className="button secondary" to={`/contests/${contest.id}`}>팀 모집 보기</Link>}
            {officialUrl ? <a className="button primary" href={officialUrl}>상세 보기 <ExternalLink /></a> : <button className="button secondary" disabled>상세 링크 없음</button>}
          </div>
        </article>
      })}
    </div>}
  </>
}
