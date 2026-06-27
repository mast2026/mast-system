import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import ActivityWeatherIcon from '../../components/ActivityWeatherIcon'
import Modal from '../../components/Modal'
import AdminTable from '../../components/AdminTable'
import { ErrorState, LoadingState } from '../../components/States'
import useQuery from '../../hooks/useQuery'
import { createScoreEvent, deleteScoreEvent, getAdminActivityWeatherRows, updateScoreEvent } from '../../services/adminService'
import { SCORE_RUBRIC, WEATHER_BASE_SCORE } from '../../utils/activityWeather'

const GAINS = SCORE_RUBRIC.filter((item) => item.group === 'gain')
const DEDUCTS = SCORE_RUBRIC.filter((item) => item.group === 'deduct')

export default function AdminActivityWeatherScreen() {
  const q = useQuery(getAdminActivityWeatherRows, [])
  const [detailId, setDetailId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const run = async (fn, successMsg) => {
    setBusy(true); setNotice('')
    try { await fn(); if (successMsg) setNotice(successMsg); await q.retry() }
    catch (error) { setNotice(error.message) }
    finally { setBusy(false) }
  }

  if (q.loading && !q.data) return <LoadingState label="전체 활동날씨를 불러오는 중" />
  if (q.error && !q.data) return <ErrorState error={q.error} retry={q.retry} />

  const rows = (q.data ?? []).filter((row) => !row.activityWeather?.exempt)
  const detailRow = detailId != null ? (q.data ?? []).find((row) => row.id === detailId) : null

  return <>
    <PageHeader title="활동날씨 관리" description={`모든 회원은 ${WEATHER_BASE_SCORE}점에서 시작하고, 항목별 가감점을 더해 0~100점으로 계산합니다.`} />
    {notice && <div className="form-notice">{notice}</div>}
    <AdminTable rows={rows} searchPlaceholder="회원, 학교, 기수 검색" getSearchText={(row) => `${row.name} ${row.school} ${row.generation}`}
      columns={[
        { key: 'name', label: '회원', render: (row) => <><b>{row.name}</b><small className="cell-sub">{[row.school, row.generation ? `${row.generation}기` : ''].filter(Boolean).join(' · ') || '-'}</small></> },
        { key: 'weather', label: '활동날씨', render: (row) => <div className="weather-cell"><ActivityWeatherIcon weather={row.activityWeather} size="tiny"/><span>{row.activityWeather.grade}</span></div> },
        { key: 'score', label: '점수', render: (row) => <strong>{row.activityWeather.score}<small style={{color:'#9aa7ad'}}>/100</small></strong>, sortValue: (row) => row.activityWeather.score ?? -1 },
        { key: 'delta', label: '가감점', render: (row) => {
          const total = row.activityWeather.totalDelta ?? 0
          const count = row.activityWeather.events?.length ?? 0
          return <span className={`delta-pill ${total >= 0 ? 'up' : 'down'}`}>{total >= 0 ? '+' : ''}{total} · {count}건</span>
        }, sortValue: (row) => row.activityWeather.totalDelta ?? 0 },
        { key: 'manage', label: '관리', render: (row) => <button className="table-button" onClick={() => { setDetailId(row.id); setNotice('') }}>점수 편집</button> },
      ]} />

    {detailRow && <Modal title={`${detailRow.name} · 점수 편집`} onClose={() => setDetailId(null)} wide>
      <ScoreEditor
        row={detailRow}
        busy={busy}
        onAddPreset={(item) => run(() => createScoreEvent({ member_id: detailRow.id, event_type: item.key, points: item.points, reason: item.label }), `${item.label} ${item.points > 0 ? '+' : ''}${item.points}점 반영`)}
        onAddCustom={(reason, points) => run(() => createScoreEvent({ member_id: detailRow.id, event_type: 'manual', points, reason }), '수동 점수를 추가했습니다.')}
        onEdit={(id, points) => run(() => updateScoreEvent(id, { points }), '점수를 수정했습니다.')}
        onDelete={(id) => run(() => deleteScoreEvent(id), '항목을 삭제했습니다.')}
      />
    </Modal>}
  </>
}

function ScoreEditor({ row, busy, onAddPreset, onAddCustom, onEdit, onDelete }) {
  const aw = row.activityWeather
  const events = aw.events ?? []
  const [customReason, setCustomReason] = useState('')
  const [customPoints, setCustomPoints] = useState('')

  return <div className="score-editor">
    <div className="score-editor-summary">
      <div><span>시작 점수</span><b>{aw.base ?? WEATHER_BASE_SCORE}</b></div>
      <div><span>가감점 합계</span><b className={(aw.totalDelta ?? 0) >= 0 ? 'up' : 'down'}>{(aw.totalDelta ?? 0) >= 0 ? '+' : ''}{aw.totalDelta ?? 0}</b></div>
      <div className="score-editor-total"><span>현재 점수</span><b>{aw.score}<small>/100</small></b><em>{aw.grade}</em></div>
    </div>

    <h3>가산 항목</h3>
    <div className="rubric-buttons">
      {GAINS.map((item) => <button key={item.key} type="button" className="rubric-btn gain" disabled={busy} onClick={() => onAddPreset(item)}>{item.label}<span>+{item.points}</span></button>)}
    </div>
    <h3>감점 항목</h3>
    <div className="rubric-buttons">
      {DEDUCTS.map((item) => <button key={item.key} type="button" className="rubric-btn deduct" disabled={busy} onClick={() => onAddPreset(item)}>{item.label}<span>{item.points}</span></button>)}
    </div>

    <h3>직접 입력</h3>
    <div className="rubric-custom">
      <input type="text" placeholder="사유 (예: 임원진 가산)" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
      <input type="number" placeholder="점수 (±)" value={customPoints} onChange={(e) => setCustomPoints(e.target.value)} />
      <button type="button" className="button primary" disabled={busy || !customPoints || Number.isNaN(Number(customPoints))} onClick={() => { onAddCustom(customReason || '수동 조정', Number(customPoints)); setCustomReason(''); setCustomPoints('') }}><Plus size={15}/>추가</button>
    </div>

    <h3>반영된 내역 <small>{events.length}건</small></h3>
    <div className="score-event-list">
      {!events.length && <p className="score-empty">아직 반영된 점수가 없습니다. 위 버튼으로 추가하세요.</p>}
      {events.map((ev) => <EventRow key={ev.id} ev={ev} busy={busy} onEdit={onEdit} onDelete={onDelete} />)}
    </div>
  </div>
}

function EventRow({ ev, busy, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(ev.points))
  return <div className="score-event-row">
    <b>{ev.label}</b>
    {editing ? <span className="score-event-edit">
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" className="table-button" disabled={busy} onClick={() => { onEdit(ev.id, Number(value)); setEditing(false) }}>저장</button>
      <button type="button" className="table-button" onClick={() => { setValue(String(ev.points)); setEditing(false) }}>취소</button>
    </span> : <>
      <em className={ev.points >= 0 ? 'up' : 'down'}>{ev.points >= 0 ? '+' : ''}{ev.points}</em>
      <button type="button" className="table-button" disabled={busy} onClick={() => setEditing(true)}>수정</button>
      <button type="button" className="table-button danger" disabled={busy} onClick={() => onDelete(ev.id)} aria-label="삭제"><Trash2 size={14}/></button>
    </>}
  </div>
}
