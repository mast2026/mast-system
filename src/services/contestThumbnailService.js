import { supabase } from '../lib/supabase'
import { requireSupabase, throwIfError } from './baseService'

const BUCKET = 'proofs'
const DIRECTORY = 'contest-thumbnails'

function thumbnailPath(contestId) {
  const id = String(contestId ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '')
  return id ? `${DIRECTORY}/${id}.webp` : ''
}

function optimizationUrl(sourceUrl) {
  const source = new URL(String(sourceUrl || '').trim())
  if (!['http:', 'https:'].includes(source.protocol)) throw new Error('썸네일 원본 주소가 올바르지 않습니다.')
  if (/^i\d\.wp\.com$/i.test(source.hostname)) {
    const directSource = new URL(`https://${source.pathname.replace(/^\//, '')}`)
    source.href = directSource.href
  }
  const url = new URL('https://images.weserv.nl/')
  url.searchParams.set('url', source.toString())
  url.searchParams.set('w', '360')
  url.searchParams.set('h', '480')
  url.searchParams.set('fit', 'contain')
  url.searchParams.set('bg', 'white')
  url.searchParams.set('output', 'webp')
  url.searchParams.set('q', '72')
  return url.toString()
}

export function getHostedContestThumbnail(contestId) {
  const path = thumbnailPath(contestId)
  if (!path || !supabase) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl || ''
}

export async function saveContestThumbnail(contestId, sourceUrl) {
  const path = thumbnailPath(contestId)
  if (!path) throw new Error('공모전 ID가 없어 썸네일을 저장하지 못했습니다.')

  const response = await fetch(optimizationUrl(sourceUrl))
  if (!response.ok) throw new Error(`썸네일 변환에 실패했습니다 (${response.status}).`)
  const blob = await response.blob()
  if (!blob.size) throw new Error('변환된 썸네일이 비어 있습니다.')
  if (blob.type !== 'image/webp') throw new Error('썸네일이 WebP 형식으로 변환되지 않았습니다.')

  const result = await requireSupabase().storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '86400',
    upsert: true,
  })
  throwIfError(result.error)
  return { path, bytes: blob.size, url: getHostedContestThumbnail(contestId) }
}
