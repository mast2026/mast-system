import { useEffect, useRef } from 'react'

export default function LogoutConfirmDialog({ onCancel, onConfirm }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  return (
    <div className="logout-confirm-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="logout-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-confirm-title" aria-describedby="logout-confirm-description">
        <h2 id="logout-confirm-title">로그아웃 하시겠습니까?</h2>
        <p id="logout-confirm-description">현재 계정에서 로그아웃하고 로그인 화면으로 이동합니다.</p>
        <div className="logout-confirm-actions">
          <button ref={cancelRef} type="button" onClick={onCancel}>취소</button>
          <button type="button" onClick={onConfirm}>로그아웃</button>
        </div>
      </section>
    </div>
  )
}
