import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Field, FormActions, TagSelector } from '../components/FormControls'
import { ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { ENVIRONMENT_TAGS, EXPERIENCE_TAGS, PARTICIPATION_TAGS, PERSONALITY_TAGS, SKILL_TAGS } from '../constants/tags'
import { getExistingApplication, submitApplication } from '../services/applicationService'
import { getTeamDetail } from '../services/teamService'

const initial = {
  survey_purpose: '',
  survey_intensity: '',
  survey_role: '',
  survey_experience: '',
  survey_strengths: '',
  survey_team_style: '',
  capability_appeal: '',
  personality_tags: [],
  skill_tags: [],
  participation_tags: [],
  experience_tags: [],
  environment_tags: [],
  customTagInput: '',
  custom_tags: [],
  availability_note: '',
  message: '',
}

const hashtagText = (tags = []) => tags.map((tag) => `#${tag}`).join(' ')

export default function ApplyTeamScreen() {
  const { id } = useParams()
  const { member } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const q = useQuery(async () => ({
    team: await getTeamDetail(id, member.id),
    existing: await getExistingApplication(id, member.id),
  }), [id, member.id])

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const addCustomTag = () => {
    const tag = form.customTagInput.trim().replace(/^#+/, '')
    if (!tag || form.custom_tags.includes(tag)) return
    setForm((prev) => ({ ...prev, customTagInput: '', custom_tags: [...prev.custom_tags, tag] }))
  }
  const removeCustomTag = (tag) => setForm((prev) => ({ ...prev, custom_tags: prev.custom_tags.filter((item) => item !== tag) }))

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  if (!q.data.team || q.data.team.leader_id === member.id || q.data.team.teamMembers.some((item) => item.id === member.id) || q.data.team.status !== 'recruiting') {
    return <Navigate to={`/teams/${id}`} replace />
  }
  if (q.data.existing) {
    return <>
      <PageHeader title="팀 지원" back />
      <div className="status-panel"><b>이미 지원한 팀입니다.</b><BadgeStatus status={q.data.existing.status} /></div>
    </>
  }

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        ...form,
        leader_priority: '',
        survey_purpose: '',
        survey_intensity: hashtagText(form.participation_tags),
        survey_role: hashtagText(form.skill_tags),
        survey_experience: hashtagText(form.experience_tags),
        survey_strengths: form.capability_appeal,
        survey_team_style: '',
        availability_note: hashtagText(form.environment_tags),
        message: hashtagText(form.custom_tags),
      }
      await submitApplication(id, member.id, payload)
      navigate('/my/applications', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <>
    <PageHeader title={`${q.data.team.contest?.title || '공모전'} 팀 지원`} description="역량 어필과 해시태그로 간단히 지원하세요." back />
    <form className="data-form card-form apply-hashtag-form" onSubmit={submit}>
      <Field label="본인이 잘할 수 있는 역량 어필" required>
        <textarea
          value={form.capability_appeal}
          onChange={(event) => set('capability_appeal', event.target.value)}
          required
          placeholder="예: 시장조사와 자료 정리를 빠르게 할 수 있고, 발표자료 구조화와 일정 관리에 강점이 있습니다."
        />
      </Field>
      <TagSelector hashtag label="성향 해시태그" options={PERSONALITY_TAGS} value={form.personality_tags} onChange={(value) => set('personality_tags', value)} max={5} />
      <TagSelector hashtag label="역량 해시태그" options={SKILL_TAGS} value={form.skill_tags} onChange={(value) => set('skill_tags', value)} max={7} />
      <TagSelector hashtag label="참여도 해시태그" options={PARTICIPATION_TAGS} value={form.participation_tags} onChange={(value) => set('participation_tags', value)} max={4} />
      <TagSelector hashtag label="경험 해시태그" options={EXPERIENCE_TAGS} value={form.experience_tags} onChange={(value) => set('experience_tags', value)} max={4} />
      <TagSelector hashtag label="환경 해시태그" options={ENVIRONMENT_TAGS} value={form.environment_tags} onChange={(value) => set('environment_tags', value)} max={5} />
      <Field label="직접 입력 해시태그">
        <div className="custom-tag-input">
          <input value={form.customTagInput} onChange={(event) => set('customTagInput', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomTag() } }} placeholder="예: 헬스케어관심" />
          <button type="button" onClick={addCustomTag}>추가</button>
        </div>
        {!!form.custom_tags.length && <div className="custom-tag-list">{form.custom_tags.map((tag) => <button type="button" key={tag} onClick={() => removeCustomTag(tag)}>#{tag} ×</button>)}</div>}
      </Field>

      {error && <div className="form-error">{error}</div>}
      <FormActions submitting={submitting} submitLabel="지원서 제출" onCancel={() => navigate(-1)} />
    </form>
  </>
}

function BadgeStatus({ status }) {
  return <span className={`badge badge-${status}`}>{status === 'pending' ? '검토 중' : status === 'accepted' ? '승인' : '반려'}</span>
}
