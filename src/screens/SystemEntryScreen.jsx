import { CalendarDays, ChevronRight, Megaphone, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

const systemConfig = {
  promotion: {
    eyebrow: 'MAST PROMOTION',
    title: '홍보',
    description: '홍보 미션과 인증 현황을 확인하는 공간입니다.',
    icon: Megaphone,
    tone: 'coral',
    actions: [
      ['오늘 미션 확인', '내가 담당한 홍보 미션을 확인합니다.'],
      ['인증 제출', '홍보 게시글 링크와 이미지를 제출합니다.'],
      ['진행 현황', '인증·검토 상태를 확인합니다.'],
    ],
  },
  attendance: {
    eyebrow: 'MAST ATTENDANCE',
    title: '출석',
    description: '모임 일정과 출석 체크를 관리하는 공간입니다.',
    icon: CalendarDays,
    tone: 'blue',
    actions: [
      ['모임 일정', '참여 가능한 모임 일정을 확인합니다.'],
      ['출석 체크', '현장 또는 온라인 출석을 기록합니다.'],
      ['내 출석 현황', '활동날씨에 반영되는 출석 기록을 확인합니다.'],
    ],
  },
  contest: {
    eyebrow: 'MAST CONTEST',
    title: '공모전',
    description: '공모전 팀 모집과 지원 현황을 확인합니다.',
    icon: Trophy,
    tone: 'violet',
    actions: [
      ['공모전 보기', '진행 중인 공모전 정보를 확인합니다.'],
      ['팀 찾기', '모집 중인 팀에 지원합니다.'],
      ['내 팀', '참여 중인 팀과 일정을 확인합니다.'],
    ],
  },
}

export default function SystemEntryScreen({ type = 'promotion' }) {
  const config = systemConfig[type] || systemConfig.promotion
  const Icon = config.icon
  const primaryLink = type === 'contest' ? '/contests' : type === 'attendance' ? '/activity-weather' : '/activity-weather'

  return (
    <div className="system-entry-page">
      <section className={`system-entry-hero ${config.tone}`}>
        <div>
          <span>{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
          <Link to={primaryLink}>
            시작하기 <ChevronRight />
          </Link>
        </div>
        <div className="system-entry-visual">
          <Icon />
          <i />
          <i />
        </div>
      </section>

      <section className="system-entry-actions">
        {config.actions.map(([title, body]) => (
          <article key={title}>
            <b>{title}</b>
            <p>{body}</p>
          </article>
        ))}
      </section>

      {type === 'promotion' && (
        <p className="system-entry-note">
          GitHub의 기존 홍보시스템 코드를 연결하면 이 화면 안으로 기능을 옮기고, 별도 홍보 로그인은 제거할 예정입니다.
        </p>
      )}
    </div>
  )
}
