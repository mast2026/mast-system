import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { getContestThumbnail } from '../services/contestScrapeService'

export default function ContestThumbnail({ title, category, link }) {
  const frameRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState(link ? 'idle' : 'fallback')

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || shouldLoad || !link) return undefined
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
  }, [link, shouldLoad])

  useEffect(() => {
    if (!shouldLoad || !link) return undefined
    let active = true
    setStatus('loading')
    getContestThumbnail(link).then((url) => {
      if (!active) return
      setImageUrl(url)
      setStatus(url ? 'ready' : 'fallback')
    })
    return () => { active = false }
  }, [link, shouldLoad])

  const fallbackLabel = String(category || '공모전').split(/[·,/]/)[0].trim().slice(0, 8) || '공모전'

  return <figure ref={frameRef} className={`contest-thumbnail is-${status}`}>
    {status === 'ready' && imageUrl
      ? <img src={imageUrl} alt={`${title} 공고 이미지`} loading="lazy" decoding="async" onError={() => setStatus('fallback')} />
      : <div className="contest-thumbnail-fallback" aria-hidden="true"><ImageIcon /><span>MAST</span><b>{fallbackLabel}</b></div>}
  </figure>
}
