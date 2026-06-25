import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, ChevronRight, Home, Megaphone, ShieldCheck, Trash2, Trophy } from 'lucide-react'
import ActivityWeatherIcon from '../../components/ActivityWeatherIcon'
import Modal from '../../components/Modal'
import { Field, FormActions } from '../../components/FormControls'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { deleteAdminMember, getAdminMemberStatsRows, getMemberPositions, updateMemberAdminFields } from '../../services/adminService'

const roleLabels = {
  member: '회원',
  manager: '운영진',
  admin: '관리자',
  professor: '교수',
}

export default function AdminMembersScreen() {
  const q = useQuery(async () => {
    const [rows, positions] = await Promise.all([getAdminMemberStatsRows(), getMemberPositions()])
    return rows.map((row) => ({ ...row, position_title: positions[row.id] ?? row.position_title ?? null }))
  }, [])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />

  const keyword = search.trim().toLowerCase()
  const rows = (q.data ?? []).filter((row) => {
    if (!keyword) return true
    return `${row.name} ${row.school} ${row.major} ${row.generation} ${row.position_title || ''} ${roleLabels[row.role] || row.role}`.toLowerCase().includes(keyword)
  }).sort(compareMembers)

  return <div className="admin-member-list-page">
    {notice && <div className="form-notice">{notice}</div>}

    <section className="admin-member-list-panel">
      <header>
        <div className="admin-member-header-title">
          <Link className="admin-icon-button mini" to="/admin" aria-label="관리자 홈으로"><Home /></Link>
          <div>
            <h1>회원 관리</h1>
            <p>회원을 선택하면 출결, 홍보, 공모전, 활동날씨와 직책을 확인할 수 있습니다. 임원진이 먼저, 그 다음 기수·이름·학교 순으로 정렬됩니다.</p>
          </div>
        </div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 학교, 기수 검색" />
      </header>

      <div className="admin-member-thin-list">
        {rows.length ? rows.map((row) => <button type="button" key={row.id} onClick={() => setSelected(row)}>
          <div className={avatarClass(row)}>{initialOf(row.name)}</div>
          <div>
            <b>{row.name || '-'}{roleTitle(row) && <span className={`exec-title-inline${memberKind(row) === 'advisor' ? ' advisor' : ''}`}>{roleTitle(row)}</span>}</b>
            <small>{row.school || '-'} · {formatGeneration(row.generation)}</small>
          </div>
          <ChevronRight />
        </button>) : <div className="admin-empty-card">표시할 회원이 없습니다.</div>}
      </div>
    </section>

    {selected && <MemberDetailModal
      member={selected}
      onClose={() => setSelected(null)}
      onSaved={(message) => {
        setNotice(message)
        setSelected(null)
        q.retry()
      }}
    />}
  </div>
}

function MemberDetailModal({ member, onClose, onSaved }) {
  const [name, setName] = useState(member.name || '')
  const [school, setSchool] = useState(member.school || '')
  const [major, setMajor] = useState(member.major || '')
  const [generation, setGeneration] = useState(member.generation || '')
  const [memberType, setMemberType] = useState(() => {
    const t = String(member.position_title || '').trim()
    if (t === '지도교수') return 'professor'
    if (t === '고문') return 'advisor'
    if (t) return 'exec'
    return 'member'
  })
  const [positionTitle, setPositionTitle] = useState(() => {
    const t = String(member.position_title || '').trim()
    return ['지도교수', '고문'].includes(t) ? '' : t
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (event) => {
    event.preventDefault()
    if (memberType === 'exec' && !positionTitle.trim()) {
      setError('임원진 직책명을 입력해 주세요. (예: 회장, 총무)')
      return
    }
    setBusy(true)
    setError('')
    try {
      // role(관리자 접근 권한)은 그대로 두고, 직책은 position_title 로만 관리
      // status 는 team_matching_members 에 컬럼이 없어 저장하지 않습니다.
      const titleByType = { member: null, exec: positionTitle.trim(), professor: '지도교수', advisor: '고문' }
      const nextTitle = titleByType[memberType] ?? null
      await updateMemberAdminFields(member.id, { name, school, major, generation, position_title: nextTitle })
      onSaved('회원 정보를 저장했습니다.')
    } catch (err) {
      const message = /position_title/.test(String(err.message))
        ? '임원진 직책 저장에 실패했습니다. Supabase에서 add-position-title.sql 을 실행해 position_title 컬럼을 추가해 주세요.'
        : err.message
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`${member.name || '회원'} 정보를 삭제할까요? 연결된 지원/팀 데이터가 있으면 DB에서 삭제가 거절될 수 있습니다.`)) return
    setBusy(true)
    setError('')
    try {
      await deleteAdminMember(member.id)
      onSaved('회원 정보를 삭제했습니다.')
    } catch (err) {
      setError(err.message || '회원 삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return <Modal title={`${member.name || '회원'} 상세`} onClose={onClose} wide>
    <div className="admin-member-detail">
      <section>
        <div className="admin-member-profile-line">
          <div className={avatarClass(member, true)}>{initialOf(member.name)}</div>
          <div>
            <b>{member.name || '-'}{roleTitle(member) && <span className={`role-badge ${memberKind(member) === 'advisor' ? 'advisor' : 'exec'}`}><ShieldCheck size={12} /> {roleTitle(member)}</span>}</b>
            <small>{member.school || '-'} · {member.major || '전공 미정'} · {formatGeneration(member.generation)}</small>
          </div>
        </div>
        <div className="admin-member-detail-grid">
          <InfoCard icon={CalendarCheck} label="출결" value={attendanceLabel(member.attendanceSummary)} note={`기록 ${member.attendanceRecords?.length ?? 0}건 · OT 전 기본 점수 반영`} />
          <InfoCard icon={Megaphone} label="홍보" value={promotionLabel(member.promotionData)} note={promotionSub(member.promotionData)} />
          <InfoCard icon={Trophy} label="공모전" value={`${member.teamCount ?? 0}팀`} note={`지원 ${member.applicationCount ?? 0}건 · 대기 ${member.pendingApplicationCount ?? 0}건`} />
          {member.activityWeather?.exempt || memberKind(member) === 'advisor'
            ? <div className="admin-member-weather-card"><div><b>미적용</b><small>지도교수·고문</small></div></div>
            : <div className="admin-member-weather-card">
              <ActivityWeatherIcon weather={member.activityWeather} size="small" />
              <div><b>{member.activityWeather?.score ?? 0}점</b><small>{member.activityWeather?.grade || '-'}</small></div>
            </div>}
        </div>
        <div className="admin-member-related">
          <RelatedSection
            title="출석 내역"
            rows={member.attendanceRecords}
            empty="아직 출석 기록이 없습니다."
            render={(row) => <>
              <b>{row.session?.title || `모임 #${row.session_id}`}</b>
              <small>{formatDate(row.session?.starts_at || row.checked_at)} · {statusLabel(row.status)}</small>
            </>}
          />
          <RelatedSection
            title="홍보 인증 내역"
            rows={member.promotionProofs?.length ? member.promotionProofs : member.promotionAssignments}
            empty="홍보 인증 내역이 없습니다."
            render={(row) => <>
              <b>{row.mission_title || row.title || row.member_name || '홍보 미션'}</b>
              <small>{formatDate(row.mission_date || row.submitted_at || row.created_at)} · {statusLabel(row.status)}</small>
            </>}
          />
          <RelatedSection
            title="공모전 참여/지원"
            rows={[...(member.contestTeams ?? []), ...(member.contestApplications ?? [])]}
            empty="공모전 참여 내역이 없습니다."
            render={(row) => <>
              <b>{row.contest?.title || row.team?.introduction || row.introduction || '공모전 팀'}</b>
              <small>{row.role || row.survey_role || '지원'} · {statusLabel(row.status)}</small>
            </>}
          />
          <RelatedSection
            title="동료 평가"
            rows={member.peerReviews}
            empty="동료평가 내역이 없습니다."
            render={(row) => <>
              <b>{row.comment ? truncate(row.comment, 34) : `팀 #${row.team_id || '-'}`}</b>
              <small>참여 {row.participation ?? row.participation_score ?? '-'} · 책임 {row.sincerity ?? row.sincerity_score ?? '-'} · 소통 {row.communication ?? row.communication_score ?? '-'}</small>
            </>}
          />
        </div>
      </section>

      <form className="data-form" onSubmit={save}>
        <Field label="이름">
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="학교">
          <input value={school} onChange={(event) => setSchool(event.target.value)} />
        </Field>
        <Field label="기수">
          <input value={generation} onChange={(event) => setGeneration(event.target.value)} placeholder="예: 3" />
        </Field>
        <Field label="전공">
          <input value={major} onChange={(event) => setMajor(event.target.value)} />
        </Field>
        <Field label="직책">
          <select value={memberType} onChange={(event) => setMemberType(event.target.value)}>
            <option value="member">회원</option>
            <option value="exec">임원진</option>
            <option value="professor">지도교수</option>
            <option value="advisor">고문</option>
          </select>
        </Field>
        {memberType === 'exec' && <Field label="임원진 직책명">
          <input value={positionTitle} onChange={(event) => setPositionTitle(event.target.value)} placeholder="예: 회장, 부회장, 총무" />
        </Field>}
        <div className="admin-role-note"><ShieldCheck /> 지정한 직책이 회원 정보와 프로필 아바타 테두리에 함께 표시됩니다. 지도교수·고문은 파란색, 임원진은 노랑·하늘색 테두리예요. 관리자 로그인 권한은 별도이며 이 설정으로 바뀌지 않습니다.</div>
        {error && <div className="form-error">{error}</div>}
        <FormActions submitting={busy} submitLabel="회원 정보 저장" onCancel={onClose} />
        <button className="button danger admin-delete-member-button" type="button" onClick={remove} disabled={busy}>
          <Trash2 /> 회원 삭제
        </button>
      </form>
    </div>
  </Modal>
}

function InfoCard({ icon: Icon, label, value, note }) {
  return <article className="admin-member-info-card"><Icon /><div><span>{label}</span><b>{value}</b><small>{note}</small></div></article>
}

const ADVISOR_TITLES = ['지도교수', '고문']
// 직책 분류: advisor(지도교수·고문, 파란 그라데) / exec(임원진, 노랑·하늘 그라데) / member
function memberKind(member) {
  const t = String(member?.position_title || '').trim()
  if (ADVISOR_TITLES.includes(t)) return 'advisor'
  if (t) return 'exec'
  return 'member'
}
function roleTitle(member) {
  return String(member?.position_title || '').trim()
}
function avatarClass(member, large = false) {
  const kind = memberKind(member)
  const ring = kind === 'advisor' ? ' is-advisor' : kind === 'exec' ? ' is-exec' : ''
  return `member-mini-avatar${large ? ' large' : ''}${ring}`
}

// 기본 정렬: 지도교수·고문 먼저 → 임원진 → 기수순 → 이름 가나다순 → 학교 가나다순
function compareMembers(a, b) {
  const rank = (m) => { const k = memberKind(m); return k === 'advisor' ? 0 : k === 'exec' ? 1 : 2 }
  const aRank = rank(a)
  const bRank = rank(b)
  if (aRank !== bRank) return aRank - bRank
  const aGen = genNumber(a.generation)
  const bGen = genNumber(b.generation)
  if (aGen !== bGen) return aGen - bGen
  const nameCmp = String(a.name || '').localeCompare(String(b.name || ''), 'ko')
  if (nameCmp !== 0) return nameCmp
  return String(a.school || '').localeCompare(String(b.school || ''), 'ko')
}

function genNumber(value) {
  const n = parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 9999
}

function initialOf(name) {
  return String(name || '?').trim().slice(0, 1)
}

function formatGeneration(value) {
  const text = String(value ?? '').trim()
  if (!text) return '기수 미정'
  return text.includes('기') ? text : `${text}기`
}

function RelatedSection({ title, rows = [], empty, render }) {
  const visibleRows = (rows ?? []).filter(Boolean).slice(0, 8)
  return <section className="admin-member-related-section">
    <h3>{title}</h3>
    {visibleRows.length ? visibleRows.map((row, index) => <article key={row.id ?? `${title}-${index}`}>
      {render(row)}
    </article>) : <p>{empty}</p>}
  </section>
}

function attendanceLabel(row) {
  const rate = firstNumber(row, ['attendance_rate', 'present_rate', 'completion_rate'])
  if (rate !== null) return `${formatPercent(rate)}`
  const present = firstNumber(row, ['present_count', 'attended_count'])
  const total = firstNumber(row, ['total_count', 'session_count', 'target_count'])
  if (present !== null && total) return `${present}/${total}`
  return '기본'
}

function promotionLabel(row) {
  const rate = firstNumber(row, ['completion_rate', 'approved_rate', 'verified_rate'])
  if (rate !== null) return `${formatPercent(rate)}`
  const approved = firstNumber(row, ['approved_count', 'verified_count', 'completed_count'])
  const target = firstNumber(row, ['target_count', 'total_count', 'mission_count'])
  if (approved !== null && target) return `${approved}/${target}`
  return '없음'
}

function promotionSub(row) {
  const approved = firstNumber(row, ['approved_count', 'verified_count', 'completed_count'])
  const target = firstNumber(row, ['target_count', 'total_count', 'mission_count'])
  if (approved !== null && target !== null) return `승인 ${approved} / 대상 ${target}`
  return '홍보 데이터 확인'
}

function formatPercent(value) {
  const number = Number(value)
  const percent = number <= 1 ? number * 100 : number
  return `${Math.round(percent)}%`
}

function firstNumber(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) return Number(value)
  }
  return null
}

function formatDate(value) {
  if (!value) return '날짜 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

function statusLabel(status) {
  const map = {
    active: '활동',
    inactive: '비활성',
    pending: '대기',
    accepted: '승인',
    rejected: '거절',
    present: '출석',
    absent: '결석',
    late: '지각',
    excused: '면제',
    submitted: '제출',
    pending_review: '검토 대기',
    approved: '승인',
    missed: '미제출',
  }
  return map[status] || status || '-'
}

function truncate(value, size = 40) {
  const text = String(value ?? '')
  return text.length > size ? `${text.slice(0, size)}…` : text
}
