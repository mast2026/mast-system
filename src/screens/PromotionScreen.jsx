import { useMemo, useRef, useState } from 'react'
import { Camera, CheckCircle2, ChevronRight, Clipboard, Megaphone, RefreshCw, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import LoadingCloud from '../components/common/LoadingCloud'
import { useAuth } from '../context/AuthContext'
import useQuery from '../hooks/useQuery'
import { getPromotionDashboard, isPromotionSubmitted, promotionStatusLabel, submitPromotionProof } from '../services/promotionService'
import { formatDate } from '../utils/display'

export default function PromotionScreen() {
  const { member } = useAuth()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const q = useQuery(() => getPromotionDashboard(member), [member.id])
  const data = q.data
  const mission = data?.mission
  const assignment = data?.assignment
  const proof = data?.proof
  const postTitle = mission?.post_title || mission?.title || ''
  const postBody = mission?.post_body || mission?.body || ''
  const isAssigned = Boolean(assignment)
  const submitted = isPromotionSubmitted(assignment?.status)
  const submittedCount = useMemo(() => (data?.assignees || []).filter((item) => isPromotionSubmitted(item.status)).length, [data?.assignees])

  const onPick = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setMessage('')
    setFile(nextFile)
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result || ''))
    reader.readAsDataURL(nextFile)
  }

  const copyText = async (label, text) => {
    if (!text) return setMessage(`${label} 내용이 비어 있어요.`)
    try {
      await navigator.clipboard.writeText(text)
      setMessage(`${label} 복사 완료`)
    } catch {
      setMessage('복사 권한이 막혔어요. 내용을 직접 선택해서 복사해 주세요.')
    }
  }

  const submit = async () => {
    setMessage('')
    setSubmitting(true)
    try {
      await submitPromotionProof({
        assignment,
        mission,
        member: data.promotionMember,
        file,
        existingProof: proof,
      })
      setFile(null)
      setPreview('')
      setMessage('인증이 제출되었습니다.')
      q.retry()
    } catch (error) {
      setMessage(error.message || '인증 제출에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState error={q.error} retry={q.retry} />

  return (
    <div className="promotion-page">
      <section className="promotion-hero">
        <div>
          <span>MAST PROMOTION</span>
          <h1>홍보</h1>
          <p>오늘 미션을 확인하고 인증을 제출합니다.</p>
        </div>
        <div className="promotion-hero-icon"><Megaphone /></div>
      </section>

      {!data?.promotionMember && (
        <section className="promotion-alert">
          현재 로그인 회원과 기존 홍보 명단을 연결하지 못했어요. 이름·학교·기수가 홍보 시스템의 `members` 데이터와 일치해야 합니다.
        </section>
      )}

      {!mission ? (
        <EmptyState title="오늘 등록된 홍보 미션이 없습니다." description="관리자가 홍보 미션을 등록하면 이 화면에 표시됩니다." />
      ) : (
        <>
          <section className="promotion-mission-card">
            <div className="promotion-mission-head">
              <div>
                <span>오늘 홍보 미션</span>
                <h2>{mission.title || '홍보 미션'}</h2>
                <p>{mission.body || '등록된 미션 설명이 없습니다.'}</p>
              </div>
              <Badge value={assignment?.status || 'pending'} />
            </div>
            <div className="promotion-facts">
              <span>마감 {formatDate(mission.due_at || mission.mission_date)}</span>
              <span>대상 {data.assignees?.length || 0}명</span>
              <span>제출 {submittedCount}명</span>
            </div>
          </section>

          <section className="promotion-copy-card">
            <div className="mast-section-heading"><h2>게시글 내용</h2></div>
            <article>
              <b>제목</b>
              <p>{postTitle || '게시글 제목 없음'}</p>
              <button onClick={() => copyText('제목', postTitle)}><Clipboard /> 제목 복사</button>
            </article>
            <article>
              <b>본문</b>
              <p>{postBody || '게시글 내용 없음'}</p>
              <button onClick={() => copyText('본문', postBody)}><Clipboard /> 본문 복사</button>
            </article>
            <button className="button primary" onClick={() => copyText('제목+본문', [postTitle, postBody].filter(Boolean).join('\n\n'))}>
              제목+본문 복사
            </button>
          </section>

          <section className="promotion-submit-card">
            <div className="mast-section-heading">
              <h2>내 인증</h2>
              <span className={`promotion-status ${submitted ? 'done' : ''}`}>{promotionStatusLabel(assignment?.status)}</span>
            </div>
            {!isAssigned ? (
              <p className="promotion-muted">오늘 홍보 담당자가 아니에요. 내 기록에서 이전 미션 상태를 확인할 수 있습니다.</p>
            ) : submitted && !file ? (
              <div className="promotion-proof-preview">
                {proof?.proof_image_url ? <img src={proof.proof_image_url} alt="제출한 인증" /> : <CheckCircle2 />}
                <div>
                  <b>{promotionStatusLabel(assignment.status)}</b>
                  <p>{assignment.submitted_at ? `${formatDate(assignment.submitted_at)} 제출` : '제출 기록이 있습니다.'}</p>
                  <button className="button secondary" onClick={() => fileRef.current?.click()}><RefreshCw /> 사진 변경</button>
                </div>
              </div>
            ) : (
              <div className="promotion-upload-box" onClick={() => fileRef.current?.click()}>
                {preview ? <img src={preview} alt="인증 미리보기" /> : <><Camera /><b>에타 게시글 캡처 업로드</b><p>이미지를 선택해 인증을 제출하세요.</p></>}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={onPick} hidden />
            {isAssigned && (file || !submitted) && (
              <button className="button primary" disabled={submitting} onClick={submit}>
                {submitting ? <LoadingCloud size="small" text="제출 중..." /> : <><UploadCloud /> 인증 제출</>}
              </button>
            )}
            {message && <p className="promotion-message">{message}</p>}
          </section>
        </>
      )}

      <section className="promotion-record-card">
        <div className="mast-section-heading">
          <h2>내 홍보 기록</h2>
          <Link to="/activity-weather">활동날씨 반영 <ChevronRight /></Link>
        </div>
        {!data?.records?.length ? <p className="promotion-muted">아직 홍보 기록이 없습니다.</p> : data.records.map((record) => (
          <div className="promotion-record-row" key={record.id || `${record.mission_id}-${record.mission_date}`}>
            <span>{formatDate(record.mission_date)}</span>
            <b>{record.title || record.mission_title || '홍보 미션'}</b>
            <em>{promotionStatusLabel(record.status)}</em>
          </div>
        ))}
      </section>
    </div>
  )
}
