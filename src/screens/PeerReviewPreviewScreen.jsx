import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, UsersRound } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Field, FormActions } from '../components/FormControls'

const QUESTIONS = [
  ['participation', '참여도', '팀 활동에 꾸준히 참여했나요?'],
  ['sincerity', '책임감', '맡은 역할을 책임감 있게 수행했나요?'],
  ['collaboration', '협업 태도', '팀원들과 협력적으로 문제를 해결했나요?'],
  ['communication', '소통', '의견 공유와 피드백이 원활했나요?'],
  ['contribution', '기여도', '팀 결과물에 의미 있게 기여했나요?'],
]

const DEMO_TEAM = {
  contestTitle: '제14회 공공데이터 활용 공모전',
  teamTitle: '서비스 기획·PPT·발표 팀',
  deadline: '2026. 7. 30. 23:59',
}

const DEMO_TARGETS = [
  { id: 1, name: '김민준', role: '기획·자료조사' },
  { id: 2, name: '박서연', role: 'PPT·디자인' },
  { id: 3, name: '이도윤', role: '발표·피칭' },
]

export default function PeerReviewPreviewScreen() {
  const [form, setForm] = useState({ reviewee_id: '1', participation: 5, sincerity: 5, collaboration: 5, communication: 5, contribution: 5, comment: '' })
  const [notice, setNotice] = useState('')
  const selectedTarget = useMemo(() => DEMO_TARGETS.find((target) => String(target.id) === String(form.reviewee_id)), [form.reviewee_id])
  const average = Math.round((Number(form.participation) + Number(form.sincerity) + Number(form.collaboration) + Number(form.communication) + Number(form.contribution)) / 5 * 10) / 10
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  return <>
    <PageHeader title="동료평가 미리보기" description="실제 DB 저장 없이 회원 작성 화면을 확인합니다." back action={<Link className="button secondary small" to="/weather-prototype">프로토타입</Link>} />
    <section className="developer-weather-panel peer-preview-notice">
      <div>
        <b>개발 확인용 예시</b>
        <span>이 화면에서 제출해도 Supabase에는 저장되지 않습니다.</span>
      </div>
    </section>

    <section className="management-card peer-preview-team-card">
      <div className="card-heading">
        <div>
          <small>{DEMO_TEAM.contestTitle}</small>
          <h2>{DEMO_TEAM.teamTitle}</h2>
        </div>
        <span className="count-pill">평균 {average}/5</span>
      </div>
      <p className="muted-copy">마감일: {DEMO_TEAM.deadline}</p>
      <div className="peer-preview-members">
        {DEMO_TARGETS.map((target) => <button
          key={target.id}
          type="button"
          className={String(form.reviewee_id) === String(target.id) ? 'selected' : ''}
          onClick={() => set('reviewee_id', String(target.id))}
        >
          <UsersRound />
          <b>{target.name}</b>
          <small>{target.role}</small>
        </button>)}
      </div>
    </section>

    {notice && <div className="form-notice">{notice}</div>}
    <form className="data-form peer-review-form" onSubmit={(event) => { event.preventDefault(); setNotice(`${selectedTarget?.name || '팀원'}님 평가 예시가 완료됐습니다. 실제 저장은 하지 않았어요.`) }}>
      <Field label="평가 대상" required>
        <select value={form.reviewee_id} onChange={(event) => set('reviewee_id', event.target.value)} required>
          {DEMO_TARGETS.map((target) => <option key={target.id} value={target.id}>{target.name} · {target.role}</option>)}
        </select>
      </Field>
      {selectedTarget && <div className="selected-reviewee">{selectedTarget.name}님에 대한 평가 화면입니다.</div>}
      <div className="rating-grid">
        {QUESTIONS.map(([key, label, question]) => <Field key={key} label={label} required>
          <div className="rating-question">
            <p>{question}</p>
            <StarRating value={form[key]} label={label} onChange={(score) => set(key, score)} />
          </div>
        </Field>)}
      </div>
      <Field label="코멘트">
        <textarea value={form.comment} onChange={(event) => set('comment', event.target.value)} placeholder="예: 자료 정리와 일정 공유를 꾸준히 해줘서 팀 진행에 도움이 됐어요." />
      </Field>
      <FormActions submitting={false} submitLabel="예시 제출" />
    </form>

    <Link className="button primary wide-button" to="/activity-weather?preview=rainbow">
      동료평가 반영 후 활동날씨 예시 보기 <ArrowRight />
    </Link>
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
