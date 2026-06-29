import { useState } from 'react'
import { Cloud } from 'lucide-react'

const weatherImages = {
  rainbow: '/assets/weather/rainbow.webp',
  sunny: '/assets/weather/sunny.webp',
  partly_sunny: '/assets/weather/partly-sunny.webp',
  cloudy_bright: '/assets/weather/cloud-white.webp',
  cloudy: '/assets/weather/cloud-dark.webp',
  rainy: '/assets/weather/rainy.webp',
  collecting: '/assets/weather/cloud-white.webp',
}

export default function ActivityWeatherIcon({ weather, size = 'medium' }) {
  const [failed, setFailed] = useState(false)
  const key = weather?.weatherType ?? weather?.key ?? 'collecting'
  const src = weatherImages[key]
  return (
    <span
      className={`weather-icon weather-image-icon weather-${key} weather-size-${size}`}
      aria-label={`활동날씨 ${weather?.grade ?? weather?.label ?? '정보 없음'}`}
    >
      {src && !failed
        ? <img src={src} alt="" aria-hidden="true" draggable="false" onError={() => setFailed(true)} />
        : <Cloud />}
    </span>
  )
}
