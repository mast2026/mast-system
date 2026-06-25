export const RESULT_TYPES = [
  { value: 'participated', label: '참가 완료' },
  { value: 'not_awarded', label: '수상 없음' },
  { value: 'awarded', label: '수상' },
  { value: 'finalist', label: '본선 진출' },
  { value: 'special', label: '특별상' },
  { value: 'cancelled', label: '참가 취소' },
]

export const RESULT_LABELS = Object.fromEntries(RESULT_TYPES.map((item) => [item.value, item.label]))

export function resultLabel(value) {
  return RESULT_LABELS[value] || value || '결과 미등록'
}
