import { useMemo, useState } from 'react'
import { ArrowDownUp, CalendarDays, ExternalLink, FolderOpen, RotateCcw, Trophy, UsersRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import ContestThumbnail from '../components/ContestThumbnail'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import useQuery from '../hooks/useQuery'
import { contestDeadlineEnd, getActiveContests } from '../services/contestService'
import { formatDate, pick, safeHttpUrl } from '../utils/display'

const DAY_MS = 24 * 60 * 60 * 1000
const DEADLINE_FILTERS = [
  { value: 'all', label: '전체' },
  { value: '7', label: '7일 이내' },
  { value: '30', label: '30일 이내' },
]
const SORT_OPTIONS = [
  { value: 'deadline-asc', label: '마감 임박순' },
  { value: 'deadline-desc', label: '마감 여유순' },
  { value: 'recent', label: '최근 등록순' },
]
const EMPTY_CONTESTS = []

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

function daysUntilDeadline(value) {
  const deadline = contestDeadlineEnd(value)
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  return Math.round((deadline.getTime() - today.getTime()) / DAY_MS)
}

function deadlineTime(contest, fallback) {
  return contestDeadlineEnd(contest.registration_deadline)?.getTime() ?? fallback
}

function recentContestOrder(a, b) {
  const aNumber = Number(a.id)
  const bNumber = Number(b.id)
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return bNumber - aNumber
  return String(b.id).localeCompare(String(a.id), 'ko')
}

function deadlineBadge(days, isClosed) {
  if (isClosed || (days !== null && days < 0)) return '접수 마감'
  if (days === null) return '마감 미정'
  if (days === 0) return '오늘 마감'
  return `D-${days}`
}

export default function ContestsScreen() {
  const [searchParams] = useSearchParams()
  const [deadlineFilter, setDeadlineFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('deadline-asc')
  const isClosedPreview = searchParams.get('preview') === 'closed'
  const query = useQuery(getActiveContests, [])
  const contests = isClosedPreview ? CLOSED_PREVIEW_CONTESTS : (query.data || EMPTY_CONTESTS)

  const visibleContests = useMemo(() => {
    const filtered = deadlineFilter === 'all' ? contests : contests.filter((contest) => {
      const days = daysUntilDeadline(contest.registration_deadline)
      return days !== null && days >= 0 && days <= Number(deadlineFilter)
    })
    return filtered.slice().sort((a, b) => {
      if (sortOrder === 'recent') return recentContestOrder(a, b)
      if (sortOrder === 'deadline-desc') return deadlineTime(b, -Infinity) - deadlineTime(a, -Infinity)
      return deadlineTime(a, Infinity) - deadlineTime(b, Infinity)
    })
  }, [contests, deadlineFilter, sortOrder])

  const nearestContest = useMemo(() => {
    let nearest = null
    for (const contest of contests) {
      const days = daysUntilDeadline(contest.registration_deadline)
      if (days !== null && days >= 0 && (!nearest || days < nearest.days)) nearest = { days }
    }
    return nearest
  }, [contests])

  const resetFilters = () => {
    setDeadlineFilter('all')
    setSortOrder('deadline-asc')
  }

  return <div className="contest-directory">
    <section className="contest-directory-hero">
      <div>
        <span>MAST CONTEST</span>
        <h1>{isClosedPreview ? '마감 공모전' : '공모전'}</h1>
        <p>{isClosedPreview ? '접수 마감 이후 회원 화면 상태를 확인합니다.' : '마감이 가까운 공고부터 빠르게 살펴보세요.'}</p>
      </div>
      <div className="contest-hero-summary" aria-label={`모집 중인 공모전 ${contests.length}개`}>
        <span>{isClosedPreview ? '프리뷰' : '모집 중'}</span>
        <strong>{contests.length}</strong>
        <small>{nearestContest ? `가장 빠른 마감 ${deadlineBadge(nearestContest.days, false)}` : '새 공고를 기다리는 중'}</small>
      </div>
    </section>

    {isClosedPreview && <section className="developer-weather-panel contest-preview-panel">
      <div><b>마감 상태 프리뷰</b><span>실제 DB 데이터가 아니라 화면 확인용입니다.</span></div>
      <Link className="button secondary small" to="/weather-prototype">프로토타입으로 돌아가기</Link>
    </section>}

    {!isClosedPreview && query.loading ? <LoadingState /> : !isClosedPreview && query.error ? <ErrorState error={query.error} retry={query.retry} /> : !contests.length ? <EmptyState title="현재 모집 중인 공모전이 없습니다." /> : <>
      <section className="contest-filter-bar" aria-label="공모전 필터와 정렬">
        <div className="contest-filter-summary">
          <p aria-live="polite"><strong>{visibleContests.length}</strong>개의 공고</p>
          <label className="contest-sort-control">
            <ArrowDownUp aria-hidden="true" />
            <span className="sr-only">정렬 기준</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="contest-deadline-filters">
          <legend className="sr-only">마감일까지 남은 기간</legend>
          {DEADLINE_FILTERS.map((filter) => <button type="button" key={filter.value} className={deadlineFilter === filter.value ? 'is-selected' : ''} aria-pressed={deadlineFilter === filter.value} onClick={() => setDeadlineFilter(filter.value)}>{filter.label}</button>)}
        </fieldset>
      </section>

      {visibleContests.length ? <div className="contest-directory-list">
        {visibleContests.map((contest) => {
          const officialUrl = safeHttpUrl(contest.link)
          const isClosed = ['closed', 'finished'].includes(contest.status)
          const remainingDays = daysUntilDeadline(contest.registration_deadline)
          const isUrgent = !isClosed && remainingDays !== null && remainingDays <= 7
          return <article className={`contest-directory-card${isUrgent ? ' is-urgent' : ''}`} key={contest.id}>
            <div className="contest-card-main">
              <div className="contest-card-copy">
                <div className="contest-card-status">
                  <span className={isUrgent ? 'is-urgent' : ''}>{deadlineBadge(remainingDays, isClosed)}</span>
                  <em>{isClosed ? '종료' : '모집 중'}</em>
                </div>
                <h2>{contest.title}</h2>
                <p className="contest-organizer">{contest.organizer || '주최 기관 미정'}</p>
              </div>
              <ContestThumbnail title={contest.title} category={contest.category} link={officialUrl} />
            </div>

            {contest.previewNotice && <p className="contest-preview-note">{contest.previewNotice}</p>}

            <div className="contest-card-facts">
              <span><CalendarDays aria-hidden="true" /><b>마감</b>{formatDate(contest.registration_deadline)}</span>
              <span><FolderOpen aria-hidden="true" /><b>분야</b>{contest.category || '미정'}</span>
              <span><Trophy aria-hidden="true" /><b>상금</b>{contest.prize || '정보 없음'}</span>
              <span><UsersRound aria-hidden="true" /><b>인원</b>최대 {pick(contest, ['max_team_size'], '-')}명</span>
            </div>

            <div className="contest-directory-actions">
              {isClosed ? <button type="button" disabled>접수 마감</button> : <Link to={`/contests/${contest.id}`}>팀 모집 보기</Link>}
              {officialUrl ? <a href={officialUrl} target="_blank" rel="noreferrer">공고 보기 <ExternalLink aria-hidden="true" /></a> : <button type="button" disabled>공고 링크 없음</button>}
            </div>
          </article>
        })}
      </div> : <section className="contest-filter-empty">
        <CalendarDays aria-hidden="true" />
        <h2>이 기간에 마감되는 공고가 없어요</h2>
        <p>전체 공고로 돌아가거나 다른 기간을 골라보세요.</p>
        <button type="button" onClick={resetFilters}><RotateCcw aria-hidden="true" /> 필터 초기화</button>
      </section>}
    </>}
  </div>
}
