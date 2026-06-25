import './LoadingCloud.css'

function LoadingCloud({
  size = 'medium',
  text = '불러오는 중...',
  fullScreen = false,
  variant = 'cloud',
}) {
  const className = [
    'loading-cloud',
    `loading-cloud-${size}`,
    `loading-cloud-${variant}`,
    fullScreen ? 'loading-cloud-full-screen' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} role="status" aria-live="polite">
      <svg
        className="loading-cloud-svg"
        viewBox="0 0 160 100"
        role="img"
        aria-label="로딩 중"
      >
        {variant === 'weather' && (
          <g className="weather-sun" aria-hidden="true">
            <circle className="weather-sun-core" cx="116" cy="26" r="10" />
            <path className="weather-sun-ray ray-1" d="M116 8 V14" />
            <path className="weather-sun-ray ray-2" d="M116 38 V44" />
            <path className="weather-sun-ray ray-3" d="M98 26 H104" />
            <path className="weather-sun-ray ray-4" d="M128 26 H134" />
          </g>
        )}
        <path
          className="cloud-fill"
          d="M45 70 C30 70 20 60 20 48 C20 36 30 27 42 28 C48 16 61 10 76 14 C88 17 96 27 99 39 C112 37 125 45 130 58 C135 72 124 84 108 84 L45 84 C32 84 22 78 20 66"
        />
        <path
          className="cloud-line"
          d="M45 70 C30 70 20 60 20 48 C20 36 30 27 42 28 C48 16 61 10 76 14 C88 17 96 27 99 39 C112 37 125 45 130 58 C135 72 124 84 108 84 L45 84 C32 84 22 78 20 66"
        />
        <circle className="loading-dot dot-1" cx="62" cy="62" r="4" />
        <circle className="loading-dot dot-2" cx="80" cy="62" r="4" />
        <circle className="loading-dot dot-3" cx="98" cy="62" r="4" />
      </svg>

      {text && <p className="loading-cloud-text">{text}</p>}
    </div>
  )
}

export default LoadingCloud
