export const CELLARS = [
  { id: 'vindis1',  name: 'VINDIS #1', slots: 10, maxPerSlot: 20 },
  { id: 'vindis2',  name: 'VINDIS #2', slots: 10, maxPerSlot: 20 },
  { id: 'eurocave', name: 'EUROCAVE',  slots: 15, maxPerSlot: 12 },
]

export function cellarById(id) { return CELLARS.find(c => c.id === id) }
export function getSlots(cellar) { return Array.from({ length: cellar.slots }, (_, i) => String(i + 1)) }

export const T = {
  bg:'#0c0910', surface:'#15101c', card:'#1c1526', cardHover:'#231a2e',
  border:'#2c1e3c', borderBright:'#4a3060',
  gold:'#c9a84c', goldDim:'#8a6c2c',
  wine:'#7c1e2e', wineLight:'#a02840',
  cream:'#f0e6d3', text:'#ccc0d8', muted:'#6a5878', mutedMid:'#9080a0',
}

let _seq = 0
export const uid = () => `${Date.now()}_${++_seq}`
export const krw = n => n ? '₩' + Number(n).toLocaleString('ko-KR') : '-'
export const kdate = d => d ? new Date(d).toLocaleDateString('ko-KR') : '-'

// ── 음용 적기 ────────────────────────────────────────────────────
export function getDrinkingStatus(wine) {
  const year = new Date().getFullYear()
  const from = wine.drinkingFrom
  const to   = wine.drinkingTo

  if (!from || !to) {
    // 빈티지 기반 추정
    if (!wine.vintage) return null
    const age = year - wine.vintage
    if (age < 5)  return { status: 'young',  label: '숙성 중',     color: '#5b8dd9', icon: '🔵' }
    if (age < 15) return { status: 'ready',  label: '마시기 좋음', color: '#4a8a5e', icon: '🟢' }
    if (age < 30) return { status: 'peak',   label: '절정',        color: T.gold,    icon: '⭐' }
    return            { status: 'decline', label: '절정 지남',   color: T.muted,   icon: '⚪' }
  }

  if (year < from)  return { status: 'young',  label: `${from}년부터`,   color: '#5b8dd9', icon: '🔵', from, to }
  if (year <= to)   return { status: 'peak',   label: '지금 마시기 좋음', color: '#4a8a5e', icon: '🟢', from, to }
  return              { status: 'decline', label: '절정 지남',          color: T.muted,   icon: '⚪', from, to }
}

// ── 이미지 압축 ──────────────────────────────────────────────────
export async function compressImage(file, maxW = 320, quality = 0.75) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Anthropic API ────────────────────────────────────────────────
export async function callAI(messages, maxTokens = 800, tools = null) {
  const apiKey = localStorage.getItem('cave_anthropic_key')
  if (!apiKey) throw new Error('API 키 없음')
  const body = { model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, messages }
  if (tools) body.tools = tools
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── 공유 URL ─────────────────────────────────────────────────────
export function getShareUrl(wine) {
  const base = window.location.origin + window.location.pathname
  return `${base}?share=${wine.shareToken || wine.id}`
}

export function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text; document.body.appendChild(el)
    el.select(); document.execCommand('copy')
    document.body.removeChild(el)
  })
}
