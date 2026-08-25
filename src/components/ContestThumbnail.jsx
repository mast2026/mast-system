import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { getContestThumbnail } from '../services/contestScrapeService'
import { getHostedContestThumbnail } from '../services/contestThumbnailService'

export default function ContestThumbnail({ id, title, category, link }) {
  const frameRef = useRef(null)
  const hostedUrl = getHostedContestThumbnail(id)
  const [hostedFailed, setHostedFailed] = useState(!hostedUrl)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState(hostedUrl ? 'ready' : link ? 'idle' : 'fallback')

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || shouldLoad || !link || !hostedFailed) return undefined
    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShouldLoad(true)
      observer.disconnect()
    }, { rootMargin: '240px' })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [hostedFailed, link, shouldLoad])

  useEffect(() => {
    if (!hostedFailed || !shouldLoad || !link) return undefined
    let active = true
    setStatus('loading')
    getContestThumbnail(link).then((url) => {
      if (!active) return
      setImageUrl(url)
      setStatus(url ? 'ready' : 'fallback')
    })
    return () => { active = false }
  }, [hostedFailed, link, shouldLoad])

  const handleError = () => {
    if (!hostedFailed) {
      setHostedFailed(true)
      setStatus(link ? 'idle' : 'fallback')
      return
    }
    setStatus('fallback')
  }

  const fallbackLabel = String(category || '공모전').split(/[·,/]/)[0].trim().slice(0, 8) || '공모전'
  const displayedImage = hostedFailed ? imageUrl : hostedUrl

  return <figure ref={frameRef} className={`contest-thumbnail is-${status}`}>
    {status === 'ready' && displayedImage
      ? <img src={displayedImage} alt={`${title} 공고 이미지`} loading="lazy" decoding="async" onError={handleError} />
      : <div className="contest-thumbnail-fallback" aria-hidden="true"><ImageIcon /><span>MAST</span><b>{fallbackLabel}</b></div>}
  </figure>
}
