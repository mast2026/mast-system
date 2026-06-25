import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Field, FormActions } from '../components/FormControls'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getPeerReviewContext, submitPeerReview } from '../services/resultService'

const QUESTIONS = [
  ['participation', '참여도', '팀 활동에 꾸준히 참여했나요?'],
  ['sincerity', '책임감', '맡은 역할을 책임감 있게 수행했나요?'],
  ['collaboration', '협업 태도', '팀원들과 협력적으로 문제를 해결했나요?'],
  ['communication', '소통', '의견 공유와 피드백이 원활했나요?'],
  ['contribution', '기여도', '팀 결과물에 의미 있게 기여했나요?'],
]

export default function PeerReviewScreen() {
  const { id } = useParams()
  const { member } = useAuth()
  const q = useQuery(() => getPeerReviewContext(id, member), [id, member?.id])
  const [form, setForm] = useState({ reviewee_id: '', participation: 5, sincerity: 5, collaboration: 5, communication: 5, contribution: 5, comment: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const selectedTarget = useMemo(() => q.data?.targets?.find((target) => String(target.id) === String(form.reviewee_id)), [q.data?.targets, form.reviewee_id])

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
      setForm({ reviewee_id: '', participation: 5, sincerity: 5, collaboration: 5, communication: 5, contribution: 5, comment: '' })
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
        {QUESTIONS.map(([key, label, question]) => <Field key={key} label={label} required>
          <div className="rating-question">
            <p>{question}</p>
            <StarRating value={form[key]} label={label} onChange={(score) => set(key, score)} />
          </div>
        </Field>)}
      </div>
      <Field label="코멘트">
        <textarea value={form.comment} onChange={(event) => set('comment', event.target.value)} placeholder="선택 입력 · 함께 활동하며 좋았던 점이나 다음에 참고할 점" />
      </Field>
      <FormActions submitting={busy} submitLabel="동료평가 제출" />
    </form>}
  </>
}

function StarRating({ value, label, onChange }) {
  return <div className="star-rating" role="radiogroup" aria-label={`${label} 별점`}>
    {[1, 2, 3, 4, 5].map((score) => (
      <button
        type="button"
        key={score}
        className={score <= Number(value) ? 'selected' : ''}
        onClick={() => onChange(score)}
        aria-label={`${label} ${score}점`}
      >
        <Star />
      </button>
    ))}
    <span>{value}점</span>
  </div>
}
