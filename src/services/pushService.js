// OneSignal Web Push 연동 헬퍼
// index.html에서 OneSignal SDK를 로드하고 init합니다. 여기서는 로그인한 회원과
// OneSignal 구독을 연결(external id)하고, 푸시 허용을 요청합니다.

function withOneSignal(fn) {
  if (typeof window === 'undefined') return
  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(fn)
}

// 로그인한 회원 id를 OneSignal 구독에 연결 → 특정 회원에게 발송 가능
export function identifyPushUser(member) {
  const id = member?.id
  if (id == null) return
  withOneSignal(async (OneSignal) => {
    try {
      await OneSignal.login(String(id))
      // 학교/기수 등으로 세그먼트 발송이 필요하면 태그도 저장
      if (OneSignal.User?.addTags) {
        OneSignal.User.addTags({
          member_id: String(id),
          school: String(member.school ?? ''),
          generation: String(member.generation ?? ''),
        })
      }
    } catch { /* SDK 미로드/환경 미지원 시 무시 */ }
  })
}

// 푸시 허용 요청 (OneSignal 슬라이드다운 → 네이티브 권한)
export function promptPushPermission() {
  withOneSignal(async (OneSignal) => {
    try {
      if (OneSignal.Notifications?.permission === true) return
      if (OneSignal.Slidedown?.promptPush) await OneSignal.Slidedown.promptPush()
      else if (OneSignal.Notifications?.requestPermission) await OneSignal.Notifications.requestPermission()
    } catch { /* 무시 */ }
  })
}

// 로그아웃 시 구독 연결 해제
export function logoutPushUser() {
  withOneSignal(async (OneSignal) => {
    try { await OneSignal.logout() } catch { /* 무시 */ }
  })
}
