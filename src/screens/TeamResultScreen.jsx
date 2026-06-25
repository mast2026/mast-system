import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import Badge from '../components/Badge'
import { Field, FormActions } from '../components/FormControls'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { RESULT_TYPES, resultLabel } from '../constants/results'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getTeamResultContext, registerTeamResult } from '../services/resultService'

export default function TeamResultScreen() {
  const { id } = useParams()
  const { member } = useAuth()
  const q = useQuery(() => getTeamResultContext(id, member), [id, member?.id, member?.role])
  const [form, setForm] = useState({ award_result: 'participated', peer_review_open: false, peer_review_deadline: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!q.data?.team) return
    const team = q.data.team
    setForm({
      award_result: team.award_result || 'participated',
      peer_review_open: Boolean(team.peer_review_open),
      peer_review_deadline: team.peer_review_deadline ? String(team.peer_review_deadline).slice(0, 16) : '',
    })
  }, [q.data?.team?.id, q.data?.team?.award_result, q.data?.team?.peer_review_open, q.data?.team?.peer_review_deadline])

  if (q.loading) return <LoadingState text="결과 등록 화면을 불러오는 중..." />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />

  const { team, awards } = q.data
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      await registerTeamResult(team.id, member, form)
      setNotice('결과를 저장했고, 설정에 따라 동료평가 상태도 반영했습니다.')
      q.retry()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <PageHeader title="공모전 결과 등록" description={team.contest?.title || '팀 활동 결과를 등록합니다.'} back />
    {notice && <div className="form-notice">{notice}</div>}
    <section className="management-card result-summary">
      <div className="card-heading">
        <div>
          <small>{team.leader?.name ? `${team.leader.name} 팀` : '공모전 팀'}</small>
          <h2>{team.contest?.title || '공모전'}</h2>
        </div>
        <Badge value={team.status} />
      </div>
      <div className="result-facts">
        <span>현재 결과: <b>{resultLabel(team.award_result)}</b></span>
        <span>동료평가: <b>{team.peer_review_open ? '열림' : '대기'}</b></span>
        {team.peer_review_deadline && <span>마감: <b>{String(team.peer_review_deadline).slice(0, 10)}</b></span>}
      </div>
    </section>

    <form className="data-form" onSubmit={save}>
      <Field label="결과 유형" required>
        <select value={form.award_result} onChange={(event) => set('award_result', event.target.value)} required>
          {RESULT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="동료평가 열기">
        <label className="switch-row">
          <input type="checkbox" checked={form.peer_review_open} onChange={(event) => set('peer_review_open', event.target.checked)} />
          <span>결과 저장 후 팀원들이 서로 평가할 수 있게 합니다.</span>
        </label>
      </Field>
      <Field label="동료평가 마감일">
        <input type="datetime-local" value={form.peer_review_deadline} onChange={(event) => set('peer_review_deadline', event.target.value)} />
      </Field>
      <FormActions submitting={busy} submitLabel="결과 저장" />
    </form>

    {team.peer_review_open && <Link className="button primary wide-button" to={`/teams/${team.id}/peer-review`}><MessageSquareText />동료평가 화면 확인</Link>}

    <section className="management-card">
      <div className="section-heading"><h2>결과 등록 이력</h2><span className="count-pill">{awards.length}건</span></div>
      {!awards.length ? <EmptyState title="아직 등록된 결과 이력이 없습니다." /> : <div className="mini-list">{awards.map((award) => <span key={award.id}>{award.award_result || '-'} · {award.created_at ? String(award.created_at).slice(0, 10) : '등록일 없음'}</span>)}</div>}
    </section>
  </>
}
