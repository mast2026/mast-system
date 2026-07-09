// 공모전 링크 → 페이지를 읽어 공모전명·주최·마감일 등을 추정 추출
// 브라우저에서는 CORS 때문에 외부 사이트를 직접 못 읽으므로,
// JS 렌더링까지 해주는 리더 프록시(r.jina.ai)로 본문을 가져온 뒤 규칙으로 파싱합니다.
// 결과는 "추정값"이라 저장 전 관리자가 확인·수정하는 것을 전제로 합니다.

const READER = 'https://r.jina.ai/'

function normalizeUrl(input) {
  let s = String(input || '').trim()
  if (!s) return ''
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try { return new URL(s).toString() } catch { return '' }
}

// 본문에서 YYYY(.|-|/|년) MM(.|-|/|월) DD 형태의 날짜를 위치와 함께 수집
function extractDates(text) {
  const out = []
  const re = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g
  let m
  while ((m = re.exec(text))) {
    const y = +m[1], mo = +m[2], da = +m[3]
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      out.push({ idx: m.index, iso: `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}` })
    }
  }
  return out
}

// 마감 관련 키워드 근처의 날짜를 우선, 없으면 오늘 이후 가장 이른 날짜를 마감일로 추정
function guessDeadline(content) {
  const dates = extractDates(content)
  if (!dates.length) return ''
  const kw = /(접수\s*마감|신청\s*마감|공모\s*마감|모집\s*마감|접수\s*종료|마감일|마감|까지)/g
  let best = null, bestDist = Infinity
  let m
  while ((m = kw.exec(content))) {
    for (const d of dates) {
      const dist = d.idx - m.index
      if (dist >= -50 && dist < 220 && Math.abs(dist) < bestDist) { bestDist = Math.abs(dist); best = d }
    }
  }
  if (best) return best.iso
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const future = dates.filter((d) => new Date(d.iso) >= today).sort((a, b) => (a.iso < b.iso ? -1 : 1))
  if (future.length) return future[0].iso
  return dates.slice().sort((a, b) => (a.iso < b.iso ? 1 : -1))[0].iso
}

function guessPeriod(content) {
  const lines = content.split(/\n+/)
  const l = lines.find((x) => /(접수|공모|모집|신청)\s*기간/.test(x) && /20\d{2}/.test(x))
  return l ? l.replace(/[#*>|_`]/g, '').trim().slice(0, 90) : ''
}

function guessOrganizer(content, title) {
  const m = content.match(/(주최|주관)[\s:/·|]*([^\n|]{2,40})/)
  if (m) {
    const v = m[2].replace(/[#*>|_`]/g, '').split(/주관|주최|·|,|\//)[0].trim()
    if (v.length >= 2) return v
  }
  const b = String(title).match(/^\[([^\]]{2,30})\]/)
  return b ? b[1].trim() : ''
}

function cleanTitle(title) {
  return String(title || '').replace(/[#*`]/g, '').split(/[|–—]| - /)[0].trim().slice(0, 120)
}

function firstMeaningfulLine(content) {
  const lines = String(content || '').split(/\n+/).map((l) => l.replace(/[#*>|_`]/g, '').trim())
  const l = lines.find((x) => x.length >= 15 && !/^https?:/.test(x))
  return l ? l.slice(0, 200) : ''
}

export async function scrapeContestFromUrl(rawUrl) {
  const url = normalizeUrl(rawUrl)
  if (!url) throw new Error('올바른 링크(주소)를 입력해 주세요. 예: https://...')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  let payload
  try {
    const res = await fetch(READER + url, {
      headers: { Accept: 'application/json', 'X-Return-Format': 'markdown' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`페이지를 불러오지 못했습니다 (${res.status}). 잠시 후 다시 시도해 주세요.`)
    payload = await res.json()
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('사이트 응답이 느려 시간 초과됐어요. 다시 시도하거나 직접 입력해 주세요.')
    throw new Error(e.message || '스크래핑에 실패했습니다. 직접 입력해 주세요.')
  } finally {
    clearTimeout(timer)
  }

  const data = payload?.data || payload || {}
  const title = cleanTitle(data.title || '')
  const content = String(data.content || data.text || '')
  const description = String(data.description || '').trim()
  return {
    title,
    organizer: guessOrganizer(content, data.title || ''),
    registration_deadline: guessDeadline(content),
    registration_period: guessPeriod(content),
    description: description || firstMeaningfulLine(content),
    link: url,
  }
}
