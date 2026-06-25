import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import { Field, FormActions, TagSelector } from '../components/FormControls'
import { ErrorState, LoadingState } from '../components/States'
import useQuery from '../hooks/useQuery'
import { getActiveContests } from '../services/contestService'
import { applyForLeader, getMyLeaderApplication } from '../services/leaderService'
import { EXPERIENCE_TAGS, LEADER_ENVIRONMENT_TAGS, LEADER_PERSONALITY_TAGS, LEADER_SKILL_TAGS, PARTICIPATION_TAGS } from '../constants/tags'

const initialForm = {
  capabilityAppeal: '',
  personalityTags: [],
  skillTags: [],
  participationTags: [],
  experienceTags: [],
  environmentTags: [],
}

export default function LeaderApplicationScreen() {
  const { member } = useAuth()
  const [params] = useSearchParams()
  const contestsQuery = useQuery(getActiveContests, [])
  const [selectedContestId, setSelectedContestId] = useState(params.get('contest') || '')
  const statusQuery = useQuery(() => selectedContestId ? getMyLeaderApplication(member.id, selectedContestId) : Promise.resolve(null), [member.id, selectedContestId])
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const selectedContest = useMemo(() => (contestsQuery.data ?? []).find((contest) => String(contest.id) === String(selectedContestId)), [contestsQuery.data, selectedContestId])
  const currentApplication = statusQuery.data

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setNotice('')
    try {
      if (!form.personalityTags.length) throw new Error('성향 해시태그를 1개 이상 선택해 주세요.')
      if (!form.skillTags.length) throw new Error('역량 해시태그를 1개 이상 선택해 주세요.')
      await applyForLeader(member.id, selectedContestId, buildLeaderMessage(form, selectedContest))
      setForm(initialForm)
      setNotice('공모전 팀장 신청을 보냈습니다.')
      statusQuery.retry()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (contestsQuery.loading) return <LoadingState />
  if (contestsQuery.error) return <ErrorState error={contestsQuery.error} retry={contestsQuery.retry} />

  return <>
    <PageHeader title="공모전 팀장 신청" description="팀 공고를 올릴 공모전을 선택하고 신청하세요." />
    <section className="status-panel leader-contest-select">
      <span>신청할 공모전</span>
      <select value={selectedContestId} onChange={(event) => { setSelectedContestId(event.target.value); setNotice('') }}>
        <option value="">공모전을 선택하세요</option>
        {contestsQuery.data.map((contest) => <option key={contest.id} value={contest.id}>{contest.title}</option>)}
      </select>
    </section>

    {!selectedContestId ? <div className="info-banner">팀 공고는 공모전별로 승인받은 뒤 작성할 수 있습니다.</div> : statusQuery.loading ? <LoadingState /> : statusQuery.error ? <ErrorState error={statusQuery.error} retry={statusQuery.retry} /> : <>
      <div className="status-panel">
        <span>선택한 공모전 신청 상태</span>
        {currentApplication ? <Badge value={currentApplication.status} /> : <b>신청 내역 없음</b>}
      </div>

      {currentApplication?.status === 'accepted' && <div className="success-panel">
        <b>이 공모전의 팀장 신청이 승인되었습니다.</b>
        <p>신청서 내용을 바탕으로 모집공고가 자동 생성됩니다. <Link className="text-link" to="/my/teams">내 팀에서 확인하기</Link></p>
      </div>}

      {currentApplication?.status === 'pending' && <div className="info-banner">운영진 검토 대기 중입니다. 승인되면 이 공모전의 팀 공고를 작성할 수 있습니다.</div>}

      {currentApplication?.status === 'rejected' && <div className="info-banner">이 신청은 반려되었습니다. 아래 내용을 보완해 같은 공모전에 다시 신청할 수 있습니다.</div>}

      {currentApplication?.status !== 'pending' && currentApplication?.status !== 'accepted' && <form className="data-form card-form" onSubmit={submit}>
        <Field label="본인이 잘할 수 있는 역량 어필" required>
          <textarea value={form.capabilityAppeal} onChange={(event) => set('capabilityAppeal', event.target.value)} minLength={10} required placeholder="내가 팀에서 잘할 수 있는 역할, 준비한 경험, 함께하고 싶은 방향을 적어주세요. 승인되면 이 내용이 모집공고 소개로 사용됩니다." />
        </Field>
        <TagSelector label="성향 해시태그" options={LEADER_PERSONALITY_TAGS} value={form.personalityTags} onChange={(value) => set('personalityTags', value)} max={4} />
        <TagSelector label="역량 해시태그" options={LEADER_SKILL_TAGS} value={form.skillTags} onChange={(value) => set('skillTags', value)} max={4} />
        <TagSelector label="참여도" options={PARTICIPATION_TAGS} value={form.participationTags} onChange={(value) => set('participationTags', value)} max={3} />
        <TagSelector label="경험" options={EXPERIENCE_TAGS} value={form.experienceTags} onChange={(value) => set('experienceTags', value)} max={3} />
        <TagSelector label="환경" options={LEADER_ENVIRONMENT_TAGS} value={form.environmentTags} onChange={(value) => set('environmentTags', value)} max={4} />
        {notice && <div className="form-notice">{notice}</div>}
        <FormActions submitting={submitting} submitLabel="신청하기" />
      </form>}
    </>}
  </>
}

function buildLeaderMessage(form, contest) {
  const draft = {
    capabilityAppeal: form.capabilityAppeal,
    personalityTags: form.personalityTags,
    skillTags: form.skillTags,
    participationTags: form.participationTags,
    experienceTags: form.experienceTags,
    environmentTags: form.environmentTags,
  }
  const lines = [
    ['공모전', contest?.title || '-'],
    ['역량 어필', form.capabilityAppeal],
    ['성향 해시태그', form.personalityTags.join(', ') || '-'],
    ['역량 해시태그', form.skillTags.join(', ') || '-'],
    ['참여도', form.participationTags.join(', ') || '-'],
    ['경험', form.experienceTags.join(', ') || '-'],
    ['활동 환경', form.environmentTags.join(', ') || '-'],
  ]
  return `${lines.map(([label, value]) => `[${label}]\n${value}`).join('\n\n')}\n\n[team_post_draft]\n${JSON.stringify(draft)}`
}
