import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Field, FormActions, TagSelector } from '../components/FormControls'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { INTEREST_AREAS, PERSONALITY_TAGS, ROLE_TAGS, SKILL_TAGS } from '../constants/tags'
import { getActiveContests } from '../services/contestService'
import { getAcceptedLeaderApplicationsForMember } from '../services/leaderService'
import { createTeam } from '../services/teamService'

const initial = {
  contest_id: '',
  required_members: 2,
  introduction: '',
  prize_distribution: '균등 배분',
  needed_roles: [],
  work_style: '',
  meeting_style: '',
  open_chat_url: '',
  interest_areas: [],
  personality_tags: [],
  skill_tags: [],
}

export default function CreateTeamScreen() {
  const { member } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ ...initial, contest_id: params.get('contest') || '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const q = useQuery(async () => {
    const [contests, accepted] = await Promise.all([
      getActiveContests(),
      getAcceptedLeaderApplicationsForMember(member.id),
    ])
    const approvedIds = new Set(accepted.map((item) => Number(item.contest_id)).filter(Boolean))
    return contests.filter((contest) => approvedIds.has(Number(contest.id)))
  }, [member.id])

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const team = await createTeam(member, form)
      navigate(`/teams/${team.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  if (!q.data.length) {
    return <>
      <PageHeader title="새 팀 만들기" description="승인된 공모전에 한해 팀 공고를 작성할 수 있습니다." back />
      <EmptyState title="팀 공고를 작성할 수 있는 승인 공모전이 없어요" description="먼저 공모전 팀장 신청 후 운영진 승인을 받아주세요." />
    </>
  }

  return <>
    <PageHeader title="새 팀 만들기" description="승인된 공모전에 한해 팀 공고를 작성할 수 있습니다." back />
    <form className="data-form card-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="공모전" required>
          <select value={form.contest_id} onChange={(event) => set('contest_id', event.target.value)} required>
            <option value="">선택하세요</option>
            {q.data.map((contest) => <option key={contest.id} value={contest.id}>{contest.title}</option>)}
          </select>
          <small>승인된 공모전만 표시됩니다.</small>
        </Field>
        <Field label="모집 목표 인원" required>
          <input type="number" min="2" max="99" value={form.required_members} onChange={(event) => set('required_members', event.target.value)} required />
        </Field>
      </div>

      <Field label="팀 소개 / 함께하면 좋은 점" required>
        <textarea value={form.introduction} onChange={(event) => set('introduction', event.target.value)} required />
      </Field>
      <Field label="상금 배분 방식" required>
        <input value={form.prize_distribution} onChange={(event) => set('prize_distribution', event.target.value)} required />
      </Field>
      <Field label="오픈채팅 URL">
        <input type="url" value={form.open_chat_url} onChange={(event) => set('open_chat_url', event.target.value)} placeholder="https://open.kakao.com/..." />
        <small>팀장과 승인된 팀원에게만 공개됩니다. 나중에 팀 관리에서 수정할 수도 있어요.</small>
      </Field>

      <TagSelector label="필요한 역할" options={ROLE_TAGS} value={form.needed_roles} onChange={(value) => set('needed_roles', value)} />
      <div className="form-grid">
        <Field label="진행 방식" required>
          <select value={form.work_style} onChange={(event) => set('work_style', event.target.value)} required>
            <option value="">선택하세요</option>
            <option>온라인 중심</option>
            <option>오프라인 중심</option>
            <option>온·오프라인 병행</option>
          </select>
        </Field>
        <Field label="회의 방식" required>
          <input value={form.meeting_style} onChange={(event) => set('meeting_style', event.target.value)} placeholder="예: 주 2회 저녁 화상회의" required />
        </Field>
      </div>
      <TagSelector label="관심 분야" options={INTEREST_AREAS} value={form.interest_areas} onChange={(value) => set('interest_areas', value)} />
      <TagSelector label="원하는 성향" options={PERSONALITY_TAGS} value={form.personality_tags} onChange={(value) => set('personality_tags', value)} max={5} />
      <TagSelector label="원하는 역량" options={SKILL_TAGS} value={form.skill_tags} onChange={(value) => set('skill_tags', value)} max={7} />

      {error && <div className="form-error">{error}</div>}
      <FormActions submitting={submitting} submitLabel="팀 만들기" onCancel={() => navigate(-1)} />
    </form>
  </>
}
