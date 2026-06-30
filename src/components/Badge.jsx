const labels = {
  recruiting: '모집 중',
  open: '모집 중',
  active: '진행 중',
  matched: '팀 확정',
  pending: '검토 중',
  accepted: '승인',
  approved: '승인',
  rejected: '반려',
  closed: '마감',
  completed: '완료',
  finished: '완료',
  inactive: '비활성',
  left: '나감',
  removed: '제외',
  review_required: '검토 필요',
  todo: '오늘 할 일',
  excluded: '할 일 제외',
  matching_requested: '매칭 신청',
  admin_approval_requested: '관리자 승인 필요',
  leader_reviewing: '팀장 검토중',
  recruiting_only: '모집 중',
  normal: '정상',
  published: '게시',
  draft: '숨김',
  unknown: '상태 미정',
}
export default function Badge({ value = 'unknown' }) {
  const key = String(value).toLowerCase()
  return <span className={`badge badge-${key}`}>{labels[key] ?? value}</span>
}
