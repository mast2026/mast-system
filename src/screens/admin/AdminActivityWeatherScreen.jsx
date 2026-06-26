import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import ActivityWeatherIcon from '../../components/ActivityWeatherIcon'
import Modal from '../../components/Modal'
import AdminTable from '../../components/AdminTable'
import { Field, FormActions } from '../../components/FormControls'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { createScoreEvent, getAdminActivityWeatherRows } from '../../services/adminService'

export default function AdminActivityWeatherScreen() {
  const q = useQuery(getAdminActivityWeatherRows, [])
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const save = async (values) => {
    setBusy(true); setNotice('')
    try { await createScoreEvent(values); setCreating(false); setNotice('점수 이벤트를 추가했습니다. verified=true인 이벤트만 계산에 반영됩니다.'); q.retry() }
    catch (error) { setNotice(`${error.message} · DB 컬럼 확인 필요`) }
    finally { setBusy(false) }
  }
  if (q.loading) return <LoadingState label="전체 활동날씨를 불러오는 중" />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />
  return <>
    <PageHeader title="활동날씨 관리" description="에타 홍보 40점, 오프라인 출석 30점, 공모전 동료평가 30점 기준으로 확인합니다." action={<button className="button primary" onClick={() => setCreating(true)}><Plus/>오프라인 점수 추가</button>} />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={(q.data ?? []).filter((row) => !row.activityWeather?.exempt)} searchPlaceholder="회원, 학교, 기수 검색" getSearchText={(row) => `${row.name} ${row.school} ${row.generation}`}
      columns={[
        { key: 'name', label: '회원', render: (row) => <><b>{row.name}</b><small className="cell-sub">{[row.school, row.generation ? `${row.generation}기` : ''].filter(Boolean).join(' · ') || '-'}</small></> },
        { key: 'weather', label: '활동날씨', render: (row) => {
          const aw = row.activityWeather
          return <div className="weather-cell"><ActivityWeatherIcon weather={aw} size="tiny"/><span>{aw.grade}</span></div>
        }},
        { key: 'score', label: '점수', render: (row) => {
          const aw = row.activityWeather
          return aw.isCollectingData ? <span style={{fontSize:'11px',color:'#9aa7ad'}}>수집 중</span> : <strong>{aw.score}</strong>
        }, sortValue: (row) => row.activityWeather.score ?? -1 },
        { key: 'promotion', label: '홍보', render: (row) => {
          const b = row.activityWeather.breakdown.promotion
          return <ScoreDetailButton row={row} type="promotion" label={`${Math.round(b.points ?? 0)}/${b.maxPoints}`} onClick={setDetail} />
        }, sortValue: (row) => row.activityWeather.breakdown.promotion.points ?? -1 },
        { key: 'offline', label: '출석', render: (row) => {
          const b = row.activityWeather.breakdown.offline
          return <ScoreDetailButton row={row} type="offline" label={`${Math.round(b.points ?? 0)}/${b.maxPoints}`} onClick={setDetail} />
        }, sortValue: (row) => row.activityWeather.breakdown.offline.points ?? -1 },
        { key: 'peer', label: '동료평가', render: (row) => {
          const b = row.activityWeather.breakdown.peerReview
          return <ScoreDetailButton row={row} type="peer" label={`${Math.round(b.points ?? 0)}/${b.maxPoints}`} onClick={setDetail} />
        }, sortValue: (row) => row.activityWeather.breakdown.peerReview.points ?? -1 },
      ]} />
    {creating && <Modal title="오프라인 점수 이벤트 추가" onClose={() => setCreating(false)} wide><ScoreEventForm members={q.data} onSubmit={save} onCancel={() => setCreating(false)} busy={busy}/></Modal>}
    {detail && <Modal title={`${detail.row.name} · ${detailTitle(detail.type)}`} onClose={() => setDetail(null)} wide><WeatherScoreDetail detail={detail}/></Modal>}
  </>
}

function ScoreDetailButton({ row, type, label, onClick }) {
  return <button className="score-detail-button" type="button" onClick={() => onClick({ row, type })}>{label}<span>상세</span></button>
}

function detailTitle(type) {
  return type === 'promotion' ? '에타 홍보 점수' : type === 'offline' ? '오프라인 점수' : '동료평가 점수'
}

function WeatherScoreDetail({ detail }) {
  const { row, type } = detail
  if (type === 'promotion') {
    const data = row.raw?.promotionData
    return <div className="score-detail-panel">
      <Info label="반영 기준" value="에타 홍보 미션 완료율 · 최대 40점" />
      <Info label="완료율" value={formatPercent(data?.completion_rate)} />
      <Info label="승인/목표" value={data?.target_count ? `${data?.approved_count ?? 0}/${data.target_count}` : '데이터 없음'} />
      <RawBox data={data} />
    </div>
  }
  if (type === 'offline') {
    const summary = row.raw?.attendanceSummary
    const events = row.raw?.scoreEvents ?? []
    const breakdown = row.activityWeather.breakdown.offline
    return <div className="score-detail-panel">
      <Info label="반영 기준" value="OT·오프라인 출석/운영진 인증 이벤트 · 최대 30점" />
      <Info label="현재 반영" value={breakdown?.assumedDefault ? 'OT 전 기본 점수 반영' : `${Math.round(breakdown?.points ?? 0)}/${breakdown?.maxPoints ?? 30}점`} />
      <Info label="출석률" value={summary ? formatPercent(summary?.attendance_rate) : 'OT 전 기본 점수 반영'} />
      <h3>인증 이벤트</h3>
      <div className="mini-list">{events.length ? events.map((event) => <span key={event.id}>{event.metadata?.reason || event.reason || event.memo || event.event_type || '오프라인'} · {event.score_delta ?? event.points ?? 0}점</span>) : <span>OT 전이라 기본 출석 점수를 반영 중입니다.</span>}</div>
      <RawBox data={summary} />
    </div>
  }
  const reviews = row.raw?.peerReviews ?? []
  return <div className="score-detail-panel">
    <Info label="반영 기준" value="공모전 협업 평가 평균 · 최대 30점" />
    <Info label="평가 수" value={`${reviews.length}건`} />
    <div className="peer-review-detail-list">
      {reviews.length ? reviews.map((review) => <article key={review.id}>
        <b>{review.comment || review.comments || '코멘트 없음'}</b>
        <span>참여 {scoreOf(review, 'participation')} · 성실 {scoreOf(review, 'sincerity')} · 협업 {scoreOf(review, 'collaboration')} · 소통 {scoreOf(review, 'communication')}</span>
      </article>) : <p>공모전 종료 후 동료평가가 반영됩니다.</p>}
    </div>
  </div>
}

function Info({ label, value }) {
  return <div className="score-detail-info"><b>{label}</b><span>{value || '-'}</span></div>
}

function RawBox({ data }) {
  if (!data) return null
  return <details className="raw-detail"><summary>원본 데이터 보기</summary><pre>{JSON.stringify(data, null, 2)}</pre></details>
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '데이터 없음'
  const number = Number(value)
  return `${Math.round(number <= 1 ? number * 100 : number)}%`
}

function scoreOf(row, key) {
  return row[key] ?? row[`${key}_score`] ?? '-'
}

function ScoreEventForm({ members, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState({ member_id: '', event_type: 'offline', score_delta: 0, reason: '', verified: true })
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form) }}>
    <Field label="회원" required><select value={form.member_id} onChange={(event) => set('member_id', event.target.value)} required><option value="">선택하세요</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
    <Field label="점수" required><input type="number" value={form.score_delta} onChange={(event) => set('score_delta', event.target.value)} required /></Field>
    <Field label="사유"><textarea value={form.reason} onChange={(event) => set('reason', event.target.value)} /></Field>
    <label className="check-field"><input type="checkbox" checked={Boolean(form.verified)} onChange={(event) => set('verified', event.target.checked)} /><span>verified = true</span></label>
    <FormActions submitting={busy} submitLabel="점수 추가" onCancel={onCancel}/>
  </form>
}
