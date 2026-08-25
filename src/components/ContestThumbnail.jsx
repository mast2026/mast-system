import { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { getHostedContestThumbnail } from '../services/contestThumbnailService'

export default function ContestThumbnail({ id, title, category }) {
  const hostedUrl = getHostedContestThumbnail(id)
  const [failed, setFailed] = useState(!hostedUrl)
  const fallbackLabel = String(category || '공모전').split(/[·,/]/)[0].trim().slice(0, 8) || '공모전'

  return <figure className={`contest-thumbnail is-${failed ? 'fallback' : 'ready'}`}>
    {!failed
      ? <img src={hostedUrl} alt={`${title} 공고 이미지`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <div className="contest-thumbnail-fallback" aria-hidden="true"><ImageIcon /><span>MAST</span><b>{fallbackLabel}</b></div>}
  </figure>
}
