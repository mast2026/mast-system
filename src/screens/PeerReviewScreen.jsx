import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Field, FormActions } from '../components/FormControls'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getPeerReviewContext, submitPeerReview } from '../services/resultService'

// 항목: 존중 / 아이디어 / 융통성 (각 1~5점)
// DB 컬럼 재활용 매핑 — 존중→participation, 아이디어→collaboration, 융통성→communication
const QUESTIONS = [
  ['participation', '존중', '팀원을 존중하며 협업했나요?'],
  ['collaboration', '아이디어', '아이디어 제시로 팀에 기여했나요?'],
  ['communication', '융통성', '상황에 유연하게 잘 대처했나요?'],
]

export default function PeerReviewScreen() {
  const { id } = useParams()
  const { member } = useAuth()
  const q = useQuery(() => getPeerReviewContext(id, member), [id, member?.id])
  const [form, setForm] = useState({ reviewee_id: '', participation: 5, collaboration: 5, communication: 5, comment: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const selectedTarget = useMemo(() => q.data?.targets?.find((target) => String(target.id) === String(form.reviewee_id)), [q.data?.targets, form.reviewee_id])

  // 항목당 내림차순 강제: 이미 다른 팀원에게 준 점수보다 낮은 점수만 줄 수 있음
  const capFor = (key) => {
    const used = (q.data?.existing ?? []).map((e) => Number(e[key])).filter(Number.isFinite)
    return used.length ? Math.min(...used) - 1 : 5
  }
  // 캡을 넘는 기본값(5)을 자동으로 내려줌
  useEffect(() => {
    if (!q.data?.existing) return
    setForm((prev) => {
      const next = { ...prev }
      for (const key of ['participation', 'collaboration', 'communication']) {
        const cap = capFor(key)
        if (Number(next[key]) > cap) next[key] = Math.max(1, cap)
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.existing])

  if (q.loading) return <LoadingState text="동료평가를 불러오는 중..." />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />

  const { team, targets, existing, blockedReason } = q.data
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      await submitPeerReview(team.id, member, form)
      setNotice('동료평가를 제출했습니다.')
      setForm({ reviewee_id: '', participation: 5, collaboration: 5, communication: 5, comment: '' })
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <PageHeader title="동료평가" description="함께 활동한 팀원에 대한 협업 경험을 남겨주세요." back />
    {notice && <div className="form-notice">{notice}</div>}
    <section className="management-card">
      <div className="card-heading">
        <div>
          <small>{team.status === 'finished' ? '활동 종료 팀' : '진행 중인 팀'}</small>
          <h2>{team.introduction || '공모전 팀'}</h2>
        </div>
        <span className="count-pill">{existing.length}건 제출</span>
      </div>
      {team.peer_review_deadline && <p className="muted-copy">마감일: {String(team.peer_review_deadline).slice(0, 16).replace('T', ' ')}</p>}
    </section>

    {blockedReason ? <EmptyState title={blockedReason} /> : <form className="data-form peer-review-form" onSubmit={save}>
      <Field label="평가 대상" required>
        <select value={form.reviewee_id} onChange={(event) => set('reviewee_id', event.target.value)} required>
          <option value="">팀원을 선택하세요</option>
          {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
        </select>
      </Field>
      {selectedTarget && <div className="selected-reviewee">{selectedTarget.name}님에 대한 평가를 작성 중입니다.</div>}
      <div className="rating-grid">
        {QUESTIONS.map(([key, label, question]) => {
          const cap = capFor(key)
          return <Field key={key} label={label} required>
            <div className="rating-question">
              <p>{question}</p>
              <StarRating value={form[key]} max={cap} label={label} onChange={(score) => set(key, score)} />
              {cap < 5 && <small className="rating-cap-note">이미 더 높은 점수를 준 팀원이 있어 최대 {Math.max(1, cap)}점까지 줄 수 있어요.</small>}
            </div>
          </Field>
        })}
      </div>
      <Field label="코멘트">
        <textarea value={form.comment} onChange={(event) => set('comment', event.target.value)} placeholder="선택 입력 · 함께 활동하며 좋았던 점이나 다음에 참고할 점" />
      </Field>
      <FormActions submitting={busy} submitLabel="동료평가 제출" />
    </form>}
  </>
}

function StarRating({ value, label, onChange, max = 5 }) {
  return <div className="star-rating" role="radiogroup" aria-label={`${label} 별점`}>
    {[1, 2, 3, 4, 5].map((score) => {
      const disabled = score > max
      return (
        <button
          type="button"
          key={score}
          disabled={disabled}
          className={`${score <= Number(value) ? 'selected' : ''}${disabled ? ' disabled' : ''}`}
          onClick={() => !disabled && onChange(score)}
          aria-label={`${label} ${score}점`}
        >
          <Star />
        </button>
      )
    })}
    <span>{value}점</span>
  </div>
}
