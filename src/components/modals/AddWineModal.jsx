import { useState } from 'react'
import { CELLARS, getSlots, cellarById, T, uid, callAI } from '../../config/cellars.js'
import { Btn, lbl, ImagePicker } from '../ui.jsx'

export default function AddWineModal({ pre = {}, onAdd, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const initCellar = pre.cellarId || 'vindis1'
  const [form, setForm] = useState({
    name: '', vintage: '', qty: 1, price: '', purchaseDate: today,
    cellarId: initCellar, slot: pre.slot || '1',
    imageUrl: '', notes: '',
  })
  const [aiLoad, setAiLoad] = useState(false)
  const [aiInfo, setAiInfo] = useState(null)
  const [imgSrc, setImgSrc] = useState('')
  const [imgSearching, setImgSearching] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const curCellar = cellarById(form.cellarId)

  async function runAI() {
    if (!form.name.trim()) return
    setAiLoad(true); setAiInfo(null); setImgSearching(true); setImgErr(false)
    try {
      const q = form.vintage ? `${form.name} ${form.vintage}` : form.name
      const data = await callAI([{
        role: 'user',
        content: `와인 "${q}"를 Vivino·Wine-Searcher에서 검색하고 JSON만 반환 (마크다운 없이):
{"producer":"생산자","region":"지역","country":"국가","grape":"품종","description":"한국어 2문장","imageUrl":"이미지URL또는빈문자열","vivinoPrice":가격숫자또는null,"vivinoRating":평점숫자또는null,"wineSearcherPrice":750ml1병가격숫자또는null}`,
      }], 700, [{ type: 'web_search_20250305', name: 'web_search' }])
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '{}'
      const info = JSON.parse(text.replace(/```json|```/g, '').trim())
      setAiInfo(info)
      if (info.imageUrl) { set('imageUrl', info.imageUrl); setImgSrc('ai'); setImgErr(false) }
      else setImgErr(true)
    } catch (e) {
      console.error(e)
      if (e.message === 'API 키 없음') alert('⚙️ 설정에서 Claude API 키를 입력해주세요')
      setImgErr(true)
    }
    setAiLoad(false); setImgSearching(false)
  }

  function submit() {
    if (!form.name.trim()) { alert('와인 이름을 입력하세요'); return }
    onAdd({
      ...form, ...(aiInfo || {}),
      id: uid(),
      vintage: form.vintage ? parseInt(form.vintage) : null,
      qty: parseInt(String(form.qty)) || 1,
      price: parseInt(String(form.price).replace(/,/g, '')) || 0,
    })
  }

  const G = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: T.cream }}>와인 추가</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Name + AI */}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>와인 이름 *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="예: Château Margaux" style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && runAI()} />
            <button onClick={runAI} disabled={aiLoad || !form.name.trim()} style={{
              background: aiLoad || !form.name.trim() ? T.muted : T.gold,
              color: T.bg, border: 'none', borderRadius: 8, padding: '9px 14px',
              fontSize: '0.8rem', fontWeight: 600,
              cursor: aiLoad || !form.name.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{aiLoad ? '검색 중...' : '🔍 AI 검색'}</button>
          </div>
        </div>

        {/* AI info */}
        {aiInfo && (
          <div style={{ background: T.surface, border: `1px solid ${T.gold}44`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ color: T.gold, fontWeight: 600, marginBottom: 8, fontSize: '0.8rem' }}>✓ AI 정보</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 8 }}>
              {[['생산자', aiInfo.producer], ['지역', aiInfo.region], ['국가', aiInfo.country], ['품종', aiInfo.grape]].map(([k, v]) =>
                v && <div key={k} style={{ fontSize: '0.78rem', color: T.text }}><span style={{ color: T.muted }}>{k}: </span>{v}</div>
              )}
            </div>
            {(aiInfo.vivinoPrice || aiInfo.wineSearcherPrice) && (
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase' }}>시장가</span>
                {aiInfo.vivinoPrice && <span style={{ fontSize: '0.78rem' }}>Vivino <strong style={{ color: T.cream }}>${aiInfo.vivinoPrice}</strong></span>}
                {aiInfo.wineSearcherPrice && <span style={{ fontSize: '0.78rem' }}>Wine-Searcher <strong style={{ color: T.cream }}>${aiInfo.wineSearcherPrice}</strong></span>}
                {aiInfo.vivinoPrice && aiInfo.wineSearcherPrice && <span style={{ fontSize: '0.78rem', color: T.gold, fontWeight: 600 }}>평균 ${Math.round((aiInfo.vivinoPrice + aiInfo.wineSearcherPrice) / 2)}</span>}
              </div>
            )}
            {aiInfo.description && <p style={{ color: T.text, fontStyle: 'italic', marginTop: 8, lineHeight: 1.5, fontSize: '0.78rem', borderLeft: `2px solid ${T.gold}`, paddingLeft: 8 }}>{aiInfo.description}</p>}
          </div>
        )}

        <div style={G}>
          <div><label style={lbl}>빈티지</label><input value={form.vintage} onChange={e => set('vintage', e.target.value)} type="number" placeholder="예: 2018" /></div>
          <div><label style={lbl}>수량 (병)</label><input value={form.qty} onChange={e => set('qty', e.target.value)} type="number" min="1" /></div>
        </div>
        <div style={G}>
          <div><label style={lbl}>구매일</label><input value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} type="date" /></div>
          <div><label style={lbl}>구매가격 (₩)</label><input value={form.price} onChange={e => set('price', e.target.value)} type="number" placeholder="예: 150000" /></div>
        </div>
        <div style={G}>
          <div>
            <label style={lbl}>셀러</label>
            <select value={form.cellarId} onChange={e => { set('cellarId', e.target.value); set('slot', '1') }}>
              {CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>칸 번호</label>
            <select value={form.slot} onChange={e => set('slot', e.target.value)}>
              {getSlots(curCellar).map(s => <option key={s} value={s}>{s}번 칸</option>)}
            </select>
          </div>
        </div>

        <ImagePicker
          imageUrl={form.imageUrl} imgSrc={imgSrc} imgSearching={imgSearching} imgErr={imgErr}
          onClear={() => { set('imageUrl', ''); setImgSrc(''); setImgErr(false) }}
          onUpload={dataUrl => { set('imageUrl', dataUrl); setImgSrc('upload'); setImgErr(false) }}
          onRetry={runAI}
        />

        <div style={{ marginBottom: 22 }}>
          <label style={lbl}>메모</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="테이스팅 노트, 보관 메모 등..." style={{ resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>취소</Btn>
          <Btn variant="gold" onClick={submit}>저장</Btn>
        </div>
      </div>
    </div>
  )
}
