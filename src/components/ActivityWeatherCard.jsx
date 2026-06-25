import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ActivityWeatherIcon from './ActivityWeatherIcon'

export default function ActivityWeatherCard({ data, compact = false }) {
  if (!data) return null
  const { score, grade, weatherType, isCollectingData, message } = data
  return (
    <Link to="/activity-weather" className={`activity-weather-card ${compact ? 'compact' : ''}`}>
      <div>
        <span className="weather-eyebrow">나의 활동날씨</span>
        <h2>
          {grade}
          {!isCollectingData && <b> {Math.round(score)}점</b>}
        </h2>
        <p>{isCollectingData ? '활동 이력을 차근차근 모으고 있어요.' : message}</p>
      </div>
      <ActivityWeatherIcon weather={data} size={compact ? 'small' : 'large'} />
      <ChevronRight className="weather-arrow" />
    </Link>
  )
}
