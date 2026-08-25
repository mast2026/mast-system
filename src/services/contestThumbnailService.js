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

async function uploadThumbnail(contestId, blob) {
  const path = thumbnailPath(contestId)
  if (!path) throw new Error('공모전 ID가 없어 썸네일을 저장하지 못했습니다.')
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

export async function saveContestThumbnail(contestId, sourceUrl) {
  const response = await fetch(optimizationUrl(sourceUrl))
  if (!response.ok) throw new Error(`썸네일 변환에 실패했습니다 (${response.status}).`)
  return uploadThumbnail(contestId, await response.blob())
}

export async function saveContestFallbackThumbnail(contestId, title, category) {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 480
  const context = canvas.getContext('2d')
  context.fillStyle = '#f5f9fc'
  context.fillRect(0, 0, 360, 480)
  context.strokeStyle = '#182b3a'
  context.lineWidth = 4
  context.strokeRect(18, 18, 324, 444)
  context.fillStyle = '#1684bd'
  context.font = '800 20px system-ui, sans-serif'
  context.fillText('MAST CONTEST', 40, 66)
  context.fillStyle = '#182b3a'
  context.font = '800 29px system-ui, sans-serif'
  drawWrappedText(context, String(title || '공모전'), 40, 125, 280, 42, 6)
  context.fillStyle = '#607681'
  context.font = '700 18px system-ui, sans-serif'
  context.fillText(String(category || '공모전').slice(0, 20), 40, 422)
  const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('대체 썸네일 생성에 실패했습니다.')), 'image/webp', 0.72))
  return uploadThumbnail(contestId, blob)
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  let line = ''
  let row = 0
  for (const character of [...text]) {
    if (context.measureText(line + character).width <= maxWidth) {
      line += character
      continue
    }
    context.fillText(line.trim(), x, y + row * lineHeight)
    line = character
    row += 1
    if (row === maxLines - 1) break
  }
  context.fillText(line.trim(), x, y + row * lineHeight)
}
