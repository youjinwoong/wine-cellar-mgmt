import { useState } from 'react'
import { CELLARS, getSlots, cellarById, T, uid, krw, kdate, callAI, compressImage, getDrinkingStatus, getShareUrl, copyToClipboard } from '../../config/cellars.js'
import { Btn, lbl, StarRating, ImagePicker } from '../ui.jsx'

// ── Detail Modal ────────────────────────────────────────────────
export function DetailModal({ wine, onClose, onDrink, onRemove, onUpdate, goSlot }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({ ...wine })
  const [aiLoad, setAiLoad] = useState(false)
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const c = cellarById(wine.cellarId)
  const curCellar = cellarById(form.cellarId)

  async function runAI() {
    if (!form.name?.trim()) return
    setAiLoad(true)
    try {
      const q = form.vintage ? `${form.name} ${form.vintage}` : form.name
      const apiKey = localStorage.getItem('cave_anthropic_key')?.trim()
      if (!apiKey) { alert('⚙️ 설정에서 Claude API 키를 먼저 입력해주세요!'); setAiLoad(false); return }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content:
            `와인 "${q}"의 정보를 웹에서 검색하여 JSON만 반환 (마크다운 없이):
{"producer":"생산자명","region":"지역명","country":"국가명","grape":"품종","description":"한국어 2문장","vivinoPrice":null,"vivinoRating":null,"wineSearcherPrice":null}

가격 수집 (750ml 기준):
- wine-searcher.com 한국 KRW
- dailyshot.co.kr KRW
- vivino.com USD → 현재 환율 KRW 환산
세 가격 중 가장 높은 KRW → wineSearcherPrice
vivino USD 원본 → vivinoPrice
숫자만, 모르면 null` }]
        })
      })
      const data = await res.json()
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '{}'
      const cleaned = text.replace(/```json|```/g, '').trim()
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        const info = JSON.parse(match[0])
        setForm(p => ({ ...p, ...info }))
      }
    } catch(e) {
      console.error('[EditAI]', e)
    }
    setAiLoad(false)
  }

  function saveEdit() {
    onUpdate({ ...form, vintage: parseInt(String(form.vintage)) || null, qty: parseInt(String(form.qty)) || 1, price: parseInt(String(form.price || '0').replace(/,/g, '')) || 0 })
    setEditing(false)
  }

  const G = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }

  if (editing) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: T.cream, marginBottom: 20 }}>와인 수정</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>와인 이름</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={form.name} onChange={e => setF('name', e.target.value)} style={{ flex: 1 }} />
            <button onClick={runAI} disabled={aiLoad || !form.name?.trim()} style={{
              background: aiLoad || !form.name?.trim() ? T.muted : T.gold,
              color: T.bg, border: 'none', borderRadius: 8, padding: '9px 14px',
              fontSize: '0.8rem', fontWeight: 600,
              cursor: aiLoad || !form.name?.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{aiLoad ? '검색 중...' : '🔍 AI 검색'}</button>
          </div>
        </div>
        <div style={G}>
          <div><label style={lbl}>빈티지</label><input value={form.vintage || ''} onChange={e => setF('vintage', e.target.value)} type="number" /></div>
          <div><label style={lbl}>수량</label><input value={form.qty || 1} onChange={e => setF('qty', e.target.value)} type="number" min="1" /></div>
        </div>
        <div style={G}>
          <div><label style={lbl}>구매일</label><input value={form.purchaseDate || ''} onChange={e => setF('purchaseDate', e.target.value)} type="date" /></div>
          <div><label style={lbl}>구매가격 (₩)</label><input value={form.price || ''} onChange={e => setF('price', e.target.value)} type="number" /></div>
        </div>
        <div style={G}>
          <div><label style={lbl}>시장가 (₩) <span style={{ color: T.gold, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Wine-Searcher·데일리샷 기준</span></label><input value={form.wineSearcherPrice || ''} onChange={e => setF('wineSearcherPrice', parseInt(e.target.value) || null)} type="number" placeholder="예: 1500000" /></div>
          <div><label style={lbl}>Vivino 가격 ($) / 평점</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.vivinoPrice || ''} onChange={e => setF('vivinoPrice', parseFloat(e.target.value) || null)} type="number" placeholder="USD" style={{ flex: 1 }} />
              <input value={form.vivinoRating || ''} onChange={e => setF('vivinoRating', parseFloat(e.target.value) || null)} type="number" placeholder="평점" step="0.1" min="0" max="5" style={{ width: 70 }} />
            </div>
          </div>
        </div>
        <div style={G}>
          <div>
            <label style={lbl}>셀러</label>
            <select value={form.cellarId} onChange={e => { setF('cellarId', e.target.value); setF('slot', '1') }}>
              {CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>칸 번호</label>
            <select value={form.slot} onChange={e => setF('slot', e.target.value)}>
              {getSlots(curCellar).map(s => <option key={s} value={s}>{s}번 칸</option>)}
            </select>
          </div>
        </div>
        <ImagePicker
          imageUrl={form.imageUrl || ''} imgSrc="" imgSearching={false} imgErr={false}
          onClear={() => setF('imageUrl', '')}
          onUpload={dataUrl => setF('imageUrl', dataUrl)}
          onRetry={() => {}}
        />
        <div style={{ marginBottom: 22 }}><label style={lbl}>메모</label><textarea value={form.notes || ''} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setEditing(false)}>취소</Btn>
          <Btn variant="gold" onClick={saveEdit}>저장</Btn>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          {wine.imageUrl
            ? <img src={wine.imageUrl} alt={wine.name} style={{ width: 80, height: 112, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
            : <div style={{ width: 80, height: 112, background: T.surface, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', border: `1px solid ${T.border}` }}>🍷</div>
          }
          <div style={{ flex: 1 }}>
            <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', color: T.muted, fontSize: '1.1rem' }}>✕</button>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', color: T.cream, lineHeight: 1.3, marginBottom: 6 }}>{wine.name}</h2>
            {wine.vintage && <div style={{ color: T.gold, fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>{wine.vintage}</div>}
            {wine.producer && <div style={{ fontSize: '0.78rem', color: T.muted }}>{wine.producer}</div>}
            {wine.region && <div style={{ fontSize: '0.78rem', color: T.muted }}>{wine.country ? `${wine.region}, ${wine.country}` : wine.region}</div>}
            {wine.grape && <div style={{ fontSize: '0.76rem', color: T.muted, marginTop: 2 }}>🍇 {wine.grape}</div>}
          </div>
        </div>
        {wine.description && <p style={{ fontSize: '0.84rem', color: T.text, fontStyle: 'italic', lineHeight: 1.6, borderLeft: `2px solid ${T.gold}`, paddingLeft: 12, marginBottom: 16 }}>{wine.description}</p>}

        {/* Market price */}
        {(wine.vivinoPrice || wine.wineSearcherPrice) && (() => {
          const vp = wine.vivinoPrice, wp = wine.wineSearcherPrice
          const krw = n => '₩' + Number(n).toLocaleString('ko-KR')
          return (
            <div style={{ background: T.surface, border: `1px solid ${T.gold}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: '0.66rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>💰 시장가 (750ml 기준)</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {wp && <div><div style={{ fontSize: '0.68rem', color: T.muted }}>🇰🇷 한국 시장가</div><div style={{ fontWeight: 700, color: T.gold, fontSize: '1.05rem' }}>{krw(wp)}</div></div>}
                {vp && <div><div style={{ fontSize: '0.68rem', color: T.muted }}>🌐 글로벌 (Wine-Searcher)</div><div style={{ fontWeight: 600, color: T.cream }}>${vp}{wine.vivinoRating && <span style={{ fontSize: '0.72rem', color: T.muted, marginLeft: 6 }}>⭐{wine.vivinoRating}</span>}</div></div>}
              </div>
            </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[['수량', `${wine.qty || 1}병`], ['구매가격', krw(wine.price)], ['구매일', kdate(wine.purchaseDate)], ['위치', `${c?.name} · ${wine.slot}번 칸`]].map(([k, v]) => (
            <div key={k} style={{ background: T.surface, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: '0.66rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{k}</div>
              <div style={{ fontSize: '0.9rem', color: T.cream, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
        {wine.notes && <div style={{ background: T.surface, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.border}`, marginBottom: 16 }}><div style={{ fontSize: '0.66rem', color: T.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>메모</div><div style={{ fontSize: '0.85rem', color: T.text }}>{wine.notes}</div></div>}

        <hr style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '16px 0' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => { goSlot(wine.cellarId, wine.slot); onClose() }}>📍 위치</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>✏️ 수정</Btn>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="wine" size="sm" onClick={() => { onDrink(wine); onClose() }}>🍷 마심</Btn>
            {confirmDelete
              ? <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#c0392b22', border: '1px solid #c0392b', borderRadius: 8, padding: '4px 10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#e07070' }}>삭제?</span>
                  <button onClick={onRemove} style={{ background: '#c0392b', color: 'white', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', cursor: 'pointer' }}>확인</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', cursor: 'pointer' }}>취소</button>
                </div>
              : <Btn variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>삭제</Btn>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Drink Modal ─────────────────────────────────────────────────
export function DrinkModal({ wine, onConfirm, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ date: today, companions: '', occasion: '', rating: 0, review: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const c = cellarById(wine.cellarId)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${T.border}` }}>
          {wine.imageUrl ? <img src={wine.imageUrl} alt="" style={{ width: 52, height: 74, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 52, height: 74, background: T.surface, borderRadius: 7, border: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>🍷</div>}
          <div>
            <div style={{ fontSize: '0.72rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontWeight: 600 }}>🥂 마심 기록</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600, color: T.cream }}>{wine.name}</div>
            {wine.vintage && <div style={{ fontSize: '0.85rem', color: T.gold, marginTop: 3 }}>{wine.vintage}</div>}
            <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 2 }}>{c?.name} · {wine.slot}번 칸 · {wine.qty || 1}병 중 1병 차감</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>마신 날짜</label><input value={form.date} onChange={e => set('date', e.target.value)} type="date" /></div>
          <div><label style={lbl}>자리 / 특별한 날</label><input value={form.occasion} onChange={e => set('occasion', e.target.value)} placeholder="생일, 기념일..." /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={lbl}>함께한 사람</label><input value={form.companions} onChange={e => set('companions', e.target.value)} placeholder="아내, 친구들, 혼자..." /></div>
        <div style={{ marginBottom: 14 }}><label style={lbl}>평점</label><StarRating value={form.rating} onChange={v => set('rating', v)} /></div>
        <div style={{ marginBottom: 22 }}><label style={lbl}>한마디 <span style={{ color: T.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(선택)</span></label><textarea value={form.review} onChange={e => set('review', e.target.value)} rows={3} placeholder="맛, 향, 느낌... 다음에 다시 마시고 싶은지" style={{ resize: 'vertical' }} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>취소</Btn>
          <Btn variant="gold" onClick={() => onConfirm({ ...form, id: uid(), wineId: wine.id, wineName: wine.name, wineVintage: wine.vintage, cellarName: cellarById(wine.cellarId)?.name, slot: wine.slot, imageUrl: wine.imageUrl || '' })}>
            🍷 기록하고 마심
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Settings Modal ──────────────────────────────────────────────
export function SettingsModal({ onClose }) {
  const [key, setKey] = useState(localStorage.getItem('cave_anthropic_key') || '')
  const [saved, setSaved] = useState(false)
  function save() { localStorage.setItem('cave_anthropic_key', key.trim()); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: T.cream }}>⚙️ 설정</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ background: T.surface, borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.8rem', color: T.text, lineHeight: 1.6 }}>
          <strong style={{ color: T.gold }}>Claude API 키</strong>가 있으면:<br />
          • 와인 정보 자동 검색 (생산자, 지역, 가격)<br />
          • 사진으로 와인 일괄 입력<br />
          <span style={{ color: T.muted, fontSize: '0.75rem' }}>키는 이 기기의 localStorage에만 저장됩니다.</span>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Anthropic API Key</label>
          <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="sk-ant-api03-..." />
        </div>
        <div style={{ marginBottom: 8, fontSize: '0.75rem', color: T.muted }}>
          키 발급: <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: T.gold }}>console.anthropic.com</a>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>닫기</Btn>
          <Btn variant="gold" onClick={save}>{saved ? '✓ 저장됨' : '저장'}</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Bulk Import Modal ───────────────────────────────────────────
// 모바일 EXIF orientation 읽기
async function getExifOrientation(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const view = new DataView(e.target.result)
      if (view.getUint16(0, false) !== 0xFFD8) return resolve(1)
      let offset = 2
      while (offset < view.byteLength) {
        const marker = view.getUint16(offset, false)
        offset += 2
        if (marker === 0xFFE1) {
          if (view.getUint32(offset += 2, false) !== 0x45786966) return resolve(1)
          const little = view.getUint16(offset += 6, false) === 0x4949
          offset += view.getUint32(offset + 4, little)
          const tags = view.getUint16(offset, little)
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + 2 + i * 12, little) === 0x0112)
              return resolve(view.getUint16(offset + 2 + i * 12 + 8, little))
          }
        } else if ((marker & 0xFF00) !== 0xFF00) break
        else offset += view.getUint16(offset, false)
      }
      resolve(1)
    }
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024))
  })
}

async function resizeForVision(file) {
  const orientation = await getExifOrientation(file)
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 2400
        const needsRotate = orientation >= 5 && orientation <= 8
        const srcW = img.width, srcH = img.height
        const scale = Math.min(1, MAX / Math.max(srcW, srcH))
        const w = Math.round(srcW * scale)
        const h = Math.round(srcH * scale)

        const canvas = document.createElement('canvas')
        // orientation 5~8은 가로세로 스왑
        canvas.width  = needsRotate ? h : w
        canvas.height = needsRotate ? w : h

        const ctx = canvas.getContext('2d')
        // EXIF orientation별 변환 적용
        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, w, 0); break
          case 3: ctx.transform(-1, 0, 0, -1, w, h); break
          case 4: ctx.transform(1, 0, 0, -1, 0, h); break
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
          case 6: ctx.transform(0, 1, -1, 0, h, 0); break
          case 7: ctx.transform(0, -1, -1, 0, h, w); break
          case 8: ctx.transform(0, -1, 1, 0, 0, w); break
          default: break
        }
        ctx.drawImage(img, 0, 0, w, h)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        resolve({ dataUrl, base64: dataUrl.split(',')[1] })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// Anthropic API 직접 호출 (cellars.js callAI 우회 — API 키 문제 방어)
// 이미지 분석·가격검색 모두 claude-sonnet-4-6으로 통일
async function callVisionAPI(messages, maxTokens = 2000, tools = null, vision = false) {
  const key = localStorage.getItem('cave_anthropic_key')?.trim()
  if (!key) throw new Error('API 키 없음')
  const model = 'claude-sonnet-4-6'
  const body = { model, max_tokens: maxTokens, messages }
  if (tools) body.tools = tools
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export function BulkImportModal({ onAddMany, onClose }) {
  const [step, setStep] = useState(1)
  const [cellarId, setCellarId] = useState('vindis1')
  const [slot, setSlot] = useState('1')
  const [photos, setPhotos] = useState([])
  const [wineList, setWineList] = useState([])
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState(0)
  const curCellar = cellarById(cellarId)

  // enrich 로직 분리 — handleFiles에서도 호출 가능하도록
  async function enrichWines(wines) {
    if (!wines.length) return wines
    setEnriching(true); setEnrichProgress(0)
    const webSearchTool = [{ type: 'web_search_20250305', name: 'web_search' }]
    const result = [...wines]
    const toEnrich = result.filter(w => !w._enriched && w.name && w.name !== '미확인')
    for (let i = 0; i < toEnrich.length; i++) {
      const w = toEnrich[i]
      try {
        const q = w.vintage ? `${w.name} ${w.vintage}` : w.name
        const data = await callVisionAPI([{ role: 'user', content:
          `와인 "${q}"의 정보를 웹에서 검색하여 아래 JSON 형식으로만 반환하세요 (마크다운 없이, 설명 없이):
{"producer":"생산자명","region":"지역명","country":"국가명","grape":"품종","description":"이 와인을 한국어로 2문장 설명","imageUrl":"","vivinoPrice":null,"vivinoRating":null,"wineSearcherPrice":null}

가격 수집 방법 (750ml 1병 기준):
- wine-searcher.com 한국(Korea) KRW 가격 조회
- dailyshot.co.kr KRW 가격 조회  
- vivino.com USD 가격 조회 후 현재 환율로 KRW 환산

위 세 가격 중 가장 높은 KRW 금액을 wineSearcherPrice에 입력하세요.
vivinoPrice는 vivino.com USD 원본 가격 그대로 입력하세요.

- wineSearcherPrice: KRW 숫자만, 가장 높은 가격 (예: 1100000)
- vivinoPrice: USD 숫자만, vivino 원본 (예: 634)
- vivinoRating: Vivino 평점 숫자만 (예: 4.5)
- 모르는 필드는 null로 두세요.` }],
          1500, webSearchTool)
        const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '{}'
        console.log(`[Enrich] ${q}:`, text)
        const cleaned = text.replace(/```json|```/g, '').trim()
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        const info = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        const idx = result.findIndex(x => x._id === w._id)
        if (idx !== -1) result[idx] = { ...result[idx], ...info, _enriched: true }
        setWineList([...result])
      } catch (err) {
        console.error(`[Enrich] ${w.name} 실패:`, err)
      }
      setEnrichProgress(Math.round((i + 1) / toEnrich.length * 100))
    }
    setEnriching(false)
    return result
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // API 키 선체크
    const apiKey = localStorage.getItem('cave_anthropic_key')?.trim()
    if (!apiKey) {
      alert('⚙️ 설정에서 Claude API 키를 먼저 입력해주세요!\n\n우측 상단 ⚙️ 설정 → Anthropic API Key 입력')
      return
    }

    const newPhotos = files.map(f => ({ id: uid(), file: f, dataUrl: null, status: 'pending' }))
    setPhotos(p => [...p, ...newPhotos])
    let newlyFound = []
    for (const ph of newPhotos) {
      const { dataUrl, base64 } = await resizeForVision(ph.file)
      setPhotos(p => p.map(x => x.id === ph.id ? { ...x, dataUrl, status: 'scanning' } : x))
      try {
        const data = await callVisionAPI([{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: `당신은 와인 라벨 전문가입니다. 이 셀러 사진에서 보이는 모든 와인 병의 라벨을 분석해주세요.

분석 지침:
- 병이 눕혀 있거나 라벨이 측면/부분만 보여도 최대한 읽어주세요
- 같은 와인이 여러 병 있으면 qty에 병 수를 기재하세요
- 빈티지(연도)가 라벨에 보이면 반드시 기재하세요
- 와인 이름은 라벨에 표기된 공식 명칭으로 (예: "Château Lafite Rothschild", "Opus One")
- 같은 와인이라도 빈티지가 다르면 각각 별도 항목으로 기재하세요
- 라벨을 전혀 읽을 수 없는 병만 "미확인"으로 처리하세요

반드시 아래 JSON 배열 형식만 반환하세요 (마크다운, 설명 텍스트 절대 없이):
[{"name":"와인 전체 이름","vintage":연도숫자또는null,"qty":병수정수}]` }
        ]}], 3000, null, true)

        const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '[]'
        console.log('[Vision] Raw response:', text)

        const cleaned = text.replace(/```json|```/g, '').trim()
        const match = cleaned.match(/\[[\s\S]*\]/)
        if (!match) throw new Error(`JSON 배열 없음: ${text.slice(0, 100)}`)

        const found = JSON.parse(match[0])
        if (!Array.isArray(found) || found.length === 0) throw new Error('빈 배열 반환')

        const withMeta = found.map(w => ({
          _id: uid(), name: w.name || '', vintage: w.vintage || null,
          qty: w.qty || 1, cellarId, slot, price: '', purchaseDate: '',
          imageUrl: '', notes: '', _enriched: false
        }))
        newlyFound = [...newlyFound, ...withMeta]
        setWineList(p => [...p, ...withMeta])
        setPhotos(p => p.map(x => x.id === ph.id ? { ...x, status: 'done', count: found.length } : x))
      } catch (err) {
        console.error('[Vision] Error:', err)
        const msg = err.message === 'API 키 없음'
          ? '⚙️ API 키를 설정에서 입력해주세요'
          : `인식 실패: ${err.message}`
        setPhotos(p => p.map(x => x.id === ph.id ? { ...x, status: 'error', errMsg: msg } : x))
      }
    }
    e.target.value = ''

    // 모든 사진 처리 완료 → 자동으로 step3 이동 + 가격 정보 자동 검색
    if (newlyFound.length > 0) {
      setStep(3)
      await enrichWines(newlyFound)
    }
  }

  async function runEnrich() {
    const current = wineList.filter(w => !w._enriched && w.name && w.name !== '미확인')
    await enrichWines(current)
  }

  const setField = (id, k, v) => setWineList(p => p.map(w => w._id === id ? { ...w, [k]: v } : w))
  const removeWine = id => setWineList(p => p.filter(w => w._id !== id))
  function confirm() { onAddMany(wineList.filter(w => w.name.trim() && w.name !== '미확인').map(w => ({ ...w, id: uid() }))) }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 680, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: T.cream }}>📷 사진으로 일괄 입력</h2>
            <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 4 }}>{['① 칸 선택', '② 사진 업로드', '③ 검토 및 추가'][step - 1]}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {[1, 2, 3].map(n => <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= n ? T.gold : T.border }} />)}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.7, marginBottom: 20 }}>
              촬영한 <strong style={{ color: T.cream }}>셀러와 칸 번호</strong>를 선택하세요. 한 칸씩 진행합니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
              <div><label style={lbl}>셀러</label><select value={cellarId} onChange={e => { setCellarId(e.target.value); setSlot('1') }}>{CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={lbl}>칸 번호</label><select value={slot} onChange={e => setSlot(e.target.value)}>{getSlots(curCellar).map(s => <option key={s} value={s}>{s}번 칸</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn variant="gold" onClick={() => setStep(2)}>다음 →</Btn></div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={{ background: T.surface, border: `2px dashed ${T.border}`, borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📸</div>
              <div style={{ fontSize: '0.875rem', color: T.text, marginBottom: 4 }}><strong style={{ color: T.cream }}>{cellarById(cellarId)?.name} · {slot}번 칸</strong> 와인 사진</div>
              <div style={{ fontSize: '0.78rem', color: T.muted, marginBottom: 16 }}>여러 장 선택 가능 · 라벨이 잘 보일수록 정확합니다</div>
              <label style={{ display: 'inline-block', background: T.gold, color: T.bg, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                📷 사진 선택 / 촬영
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
              </label>
            </div>
            {photos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
                {photos.map(ph => (
                  <div key={ph.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: T.surface, borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.border}` }}>
                    {ph.dataUrl && <img src={ph.dataUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', color: T.cream }}>{ph.file?.name}</div>
                      <div style={{ fontSize: '0.72rem', marginTop: 3 }}>
                        {ph.status === 'pending' && <span style={{ color: T.muted }}>대기 중...</span>}
                        {ph.status === 'scanning' && <span style={{ color: T.gold }}>🔍 분석 중...</span>}
                        {ph.status === 'done' && <span style={{ color: '#4a8a5e' }}>✓ {ph.count}종 인식</span>}
                        {ph.status === 'error' && <span style={{ color: '#c0392b' }}>✕ {ph.errMsg || '인식 실패'}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="ghost" onClick={() => setStep(1)}>← 이전</Btn>
              <Btn variant="gold" onClick={() => setStep(3)} style={{ opacity: wineList.length > 0 ? 1 : 0.4 }} disabled={wineList.length === 0}>
                {wineList.length > 0 ? `검토하기 (${wineList.length}종) →` : '사진을 업로드하세요'}
              </Btn>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.82rem', color: T.muted }}>
                <span style={{ color: T.cream, fontWeight: 600 }}>{wineList.length}종</span> 인식 →
                <span style={{ color: T.gold }}> {cellarById(cellarId)?.name} · {slot}번 칸</span>
              </div>
              <button onClick={runEnrich} disabled={enriching} style={{ background: enriching ? T.muted : T.surface, color: enriching ? T.bg : T.gold, border: `1px solid ${T.gold}44`, cursor: enriching ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem' }}>
                {enriching ? `🔍 가격 검색 중... ${enrichProgress}%` : '🔄 가격·정보 다시 검색'}
              </button>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {wineList.map(w => (
                <div key={w._id} style={{ background: T.surface, border: `1px solid ${w._enriched ? T.gold + '44' : T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 36, height: 52, background: T.card, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', border: `1px solid ${T.border}` }}>🍷</div>}
                    <div style={{ flex: 1 }}>
                      <input value={w.name} onChange={e => setField(w._id, 'name', e.target.value)} style={{ marginBottom: 6, fontWeight: 500, fontSize: '0.875rem' }} placeholder="와인 이름" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        <input value={w.vintage || ''} onChange={e => setField(w._id, 'vintage', e.target.value ? parseInt(e.target.value) : null)} type="number" placeholder="빈티지" style={{ fontSize: '0.8rem' }} />
                        <input value={w.qty} onChange={e => setField(w._id, 'qty', parseInt(e.target.value) || 1)} type="number" min="1" style={{ fontSize: '0.8rem' }} placeholder="수량" />
                        <input value={w.price || ''} onChange={e => setField(w._id, 'price', e.target.value)} type="number" placeholder="구매가 ₩" style={{ fontSize: '0.8rem' }} />
                      </div>
                      {w._enriched && <div style={{ marginTop: 5, fontSize: '0.72rem', color: T.muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {w.producer && <span>{w.producer}</span>}
                        {w.region && <span>{w.region}</span>}
                        {w.grape && <span>🍇 {w.grape}</span>}
                        {(w.vivinoPrice || w.wineSearcherPrice) && <span style={{ color: T.gold }}>${w.vivinoPrice && w.wineSearcherPrice ? Math.round((w.vivinoPrice + w.wineSearcherPrice) / 2) : (w.vivinoPrice || w.wineSearcherPrice)}</span>}
                      </div>}
                    </div>
                    <button onClick={() => removeWine(w._id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', flexShrink: 0 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Btn variant="ghost" onClick={() => setStep(2)}>← 뒤로</Btn>
              <Btn variant="gold" onClick={confirm}>🍷 {wineList.filter(w => w.name.trim() && w.name !== '미확인').length}건 전체 추가</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
