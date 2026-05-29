import { useState } from 'react'
import { CELLARS, getSlots, cellarById, T, uid, krw, kdate, callAI, compressImage } from '../../config/cellars.js'
import { Btn, lbl, StarRating, ImagePicker } from '../ui.jsx'

// ?? Detail Modal ????????????????????????????????????????????????
export function DetailModal({ wine, onClose, onDrink, onRemove, onUpdate, goSlot }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({ ...wine })
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const c = cellarById(wine.cellarId)
  const curCellar = cellarById(form.cellarId)

  function saveEdit() {
    onUpdate({ ...form, vintage: parseInt(String(form.vintage)) || null, qty: parseInt(String(form.qty)) || 1, price: parseInt(String(form.price || '0').replace(/,/g, '')) || 0 })
    setEditing(false)
  }

  const G = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }

  if (editing) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: T.cream, marginBottom: 20 }}>????섏젙</h2>
        <div style={{ marginBottom: 12 }}><label style={lbl}>????대쫫</label><input value={form.name} onChange={e => setF('name', e.target.value)} /></div>
        <div style={G}>
          <div><label style={lbl}>鍮덊떚吏</label><input value={form.vintage || ''} onChange={e => setF('vintage', e.target.value)} type="number" /></div>
          <div><label style={lbl}>?섎웾</label><input value={form.qty || 1} onChange={e => setF('qty', e.target.value)} type="number" min="1" /></div>
        </div>
        <div style={G}>
          <div><label style={lbl}>援щℓ??/label><input value={form.purchaseDate || ''} onChange={e => setF('purchaseDate', e.target.value)} type="date" /></div>
          <div><label style={lbl}>援щℓ媛寃?(??</label><input value={form.price || ''} onChange={e => setF('price', e.target.value)} type="number" /></div>
        </div>
        <div style={G}>
          <div>
            <label style={lbl}>???/label>
            <select value={form.cellarId} onChange={e => { setF('cellarId', e.target.value); setF('slot', '1') }}>
              {CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>移?踰덊샇</label>
            <select value={form.slot} onChange={e => setF('slot', e.target.value)}>
              {getSlots(curCellar).map(s => <option key={s} value={s}>{s}踰?移?/option>)}
            </select>
          </div>
        </div>
        <ImagePicker
          imageUrl={form.imageUrl || ''} imgSrc="" imgSearching={false} imgErr={false}
          onClear={() => setF('imageUrl', '')}
          onUpload={dataUrl => setF('imageUrl', dataUrl)}
          onRetry={() => {}}
        />
        <div style={{ marginBottom: 22 }}><label style={lbl}>硫붾え</label><textarea value={form.notes || ''} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setEditing(false)}>痍⑥냼</Btn>
          <Btn variant="gold" onClick={saveEdit}>???/Btn>
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
            : <div style={{ width: 80, height: 112, background: T.surface, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', border: `1px solid ${T.border}` }}>?뜼</div>
          }
          <div style={{ flex: 1 }}>
            <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', color: T.muted, fontSize: '1.1rem' }}>??/button>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', color: T.cream, lineHeight: 1.3, marginBottom: 6 }}>{wine.name}</h2>
            {wine.vintage && <div style={{ color: T.gold, fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>{wine.vintage}</div>}
            {wine.producer && <div style={{ fontSize: '0.78rem', color: T.muted }}>{wine.producer}</div>}
            {wine.region && <div style={{ fontSize: '0.78rem', color: T.muted }}>{wine.country ? `${wine.region}, ${wine.country}` : wine.region}</div>}
            {wine.grape && <div style={{ fontSize: '0.76rem', color: T.muted, marginTop: 2 }}>?뜃 {wine.grape}</div>}
          </div>
        </div>
        {wine.description && <p style={{ fontSize: '0.84rem', color: T.text, fontStyle: 'italic', lineHeight: 1.6, borderLeft: `2px solid ${T.gold}`, paddingLeft: 12, marginBottom: 16 }}>{wine.description}</p>}

        {/* Market price */}
        {(wine.vivinoPrice || wine.wineSearcherPrice) && (() => {
          const vp = wine.vivinoPrice, wp = wine.wineSearcherPrice
          const avg = vp && wp ? Math.round((vp + wp) / 2) : (vp || wp)
          return (
            <div style={{ background: T.surface, border: `1px solid ${T.gold}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: '0.66rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>?뙋 湲濡쒕쾶 ?쒖옣媛 (750ml)</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {vp && <div><div style={{ fontSize: '0.68rem', color: T.muted }}>Vivino</div><div style={{ fontWeight: 600, color: T.cream }}>${vp}{wine.vivinoRating && <span style={{ fontSize: '0.72rem', color: T.muted, marginLeft: 6 }}>狩?wine.vivinoRating}</span>}</div></div>}
                {wp && <div><div style={{ fontSize: '0.68rem', color: T.muted }}>Wine-Searcher</div><div style={{ fontWeight: 600, color: T.cream }}>${wp}</div></div>}
                {vp && wp && <div><div style={{ fontSize: '0.68rem', color: T.gold, fontWeight: 600 }}>?됯퇏</div><div style={{ fontSize: '1.1rem', fontWeight: 700, color: T.gold }}>${avg}</div></div>}
              </div>
            </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[['?섎웾', `${wine.qty || 1}蹂?], ['援щℓ媛寃?, krw(wine.price)], ['援щℓ??, kdate(wine.purchaseDate)], ['?꾩튂', `${c?.name} 쨌 ${wine.slot}踰?移?]].map(([k, v]) => (
            <div key={k} style={{ background: T.surface, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: '0.66rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{k}</div>
              <div style={{ fontSize: '0.9rem', color: T.cream, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
        {wine.notes && <div style={{ background: T.surface, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.border}`, marginBottom: 16 }}><div style={{ fontSize: '0.66rem', color: T.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>硫붾え</div><div style={{ fontSize: '0.85rem', color: T.text }}>{wine.notes}</div></div>}

        <hr style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '16px 0' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => { goSlot(wine.cellarId, wine.slot); onClose() }}>?뱧 ?꾩튂</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}>?륅툘 ?섏젙</Btn>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="wine" size="sm" onClick={() => { onDrink(wine); onClose() }}>?뜼 留덉떖</Btn>
            {confirmDelete
              ? <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#c0392b22', border: '1px solid #c0392b', borderRadius: 8, padding: '4px 10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#e07070' }}>??젣?</span>
                  <button onClick={onRemove} style={{ background: '#c0392b', color: 'white', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', cursor: 'pointer' }}>?뺤씤</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', cursor: 'pointer' }}>痍⑥냼</button>
                </div>
              : <Btn variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>??젣</Btn>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ?? Drink Modal ?????????????????????????????????????????????????
export function DrinkModal({ wine, onConfirm, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ date: today, companions: '', occasion: '', rating: 0, review: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const c = cellarById(wine.cellarId)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${T.border}` }}>
          {wine.imageUrl ? <img src={wine.imageUrl} alt="" style={{ width: 52, height: 74, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 52, height: 74, background: T.surface, borderRadius: 7, border: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>?뜼</div>}
          <div>
            <div style={{ fontSize: '0.72rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontWeight: 600 }}>?쪈 留덉떖 湲곕줉</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 600, color: T.cream }}>{wine.name}</div>
            {wine.vintage && <div style={{ fontSize: '0.85rem', color: T.gold, marginTop: 3 }}>{wine.vintage}</div>}
            <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 2 }}>{c?.name} 쨌 {wine.slot}踰?移?쨌 {wine.qty || 1}蹂?以?1蹂?李④컧</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>留덉떊 ?좎쭨</label><input value={form.date} onChange={e => set('date', e.target.value)} type="date" /></div>
          <div><label style={lbl}>?먮━ / ?밸퀎????/label><input value={form.occasion} onChange={e => set('occasion', e.target.value)} placeholder="?앹씪, 湲곕뀗??.." /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={lbl}>?④퍡???щ엺</label><input value={form.companions} onChange={e => set('companions', e.target.value)} placeholder="?꾨궡, 移쒓뎄?? ?쇱옄..." /></div>
        <div style={{ marginBottom: 14 }}><label style={lbl}>?됱젏</label><StarRating value={form.rating} onChange={v => set('rating', v)} /></div>
        <div style={{ marginBottom: 22 }}><label style={lbl}>?쒕쭏??<span style={{ color: T.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(?좏깮)</span></label><textarea value={form.review} onChange={e => set('review', e.target.value)} rows={3} placeholder="留? ?? ?먮굦... ?ㅼ쓬???ㅼ떆 留덉떆怨??띠?吏" style={{ resize: 'vertical' }} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>痍⑥냼</Btn>
          <Btn variant="gold" onClick={() => onConfirm({ ...form, id: uid(), wineId: wine.id, wineName: wine.name, wineVintage: wine.vintage, cellarName: cellarById(wine.cellarId)?.name, slot: wine.slot, imageUrl: wine.imageUrl || '' })}>
            ?뜼 湲곕줉?섍퀬 留덉떖
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ?? Settings Modal ??????????????????????????????????????????????
export function SettingsModal({ onClose }) {
  const [key, setKey] = useState(localStorage.getItem('cave_anthropic_key') || '')
  const [saved, setSaved] = useState(false)
  function save() { localStorage.setItem('cave_anthropic_key', key.trim()); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: T.cream }}>?숋툘 ?ㅼ젙</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '1.2rem' }}>??/button>
        </div>
        <div style={{ background: T.surface, borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.8rem', color: T.text, lineHeight: 1.6 }}>
          <strong style={{ color: T.gold }}>Claude API ??/strong>媛 ?덉쑝硫?<br />
          ??????뺣낫 ?먮룞 寃??(?앹궛?? 吏?? 媛寃?<br />
          ???ъ쭊?쇰줈 ????쇨큵 ?낅젰<br />
          <span style={{ color: T.muted, fontSize: '0.75rem' }}>?ㅻ뒗 ??湲곌린??localStorage?먮쭔 ??λ맗?덈떎.</span>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Anthropic API Key</label>
          <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="sk-ant-api03-..." />
        </div>
        <div style={{ marginBottom: 8, fontSize: '0.75rem', color: T.muted }}>
          ??諛쒓툒: <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: T.gold }}>console.anthropic.com</a>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>?リ린</Btn>
          <Btn variant="gold" onClick={save}>{saved ? '????λ맖' : '???}</Btn>
        </div>
      </div>
    </div>
  )
}

// ?? Bulk Import Modal ???????????????????????????????????????????
async function resizeForVision(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 1600 / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve({ dataUrl, base64: dataUrl.split(',')[1] })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
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

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newPhotos = files.map(f => ({ id: uid(), file: f, dataUrl: null, status: 'pending' }))
    setPhotos(p => [...p, ...newPhotos])
    for (const ph of newPhotos) {
      const { dataUrl, base64 } = await resizeForVision(ph.file)
      setPhotos(p => p.map(x => x.id === ph.id ? { ...x, dataUrl, status: 'scanning' } : x))
      try {
        const data = await callAI([{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: `??????ъ쭊?먯꽌 紐⑤뱺 ????쇰꺼??遺꾩꽍?섏꽭?? JSON 諛곗뿴留?諛섑솚 (?ㅻⅨ ?띿뒪???놁씠):
[{"name":"????대쫫","vintage":?곕룄?レ옄?먮뒗null,"qty":媛숈???몃퀝??]
?쇰꺼???쇰?留?蹂댁뿬??理쒕???異붿젙?섏꽭?? ?꾪? 紐⑤Ⅴ硫?name??"誘명솗???쇰줈.` }
        ]}], 2000)
        const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '[]'
        const found = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]')
        const withMeta = found.map(w => ({ _id: uid(), name: w.name || '', vintage: w.vintage || null, qty: w.qty || 1, cellarId, slot, price: '', purchaseDate: '', imageUrl: '', notes: '', _enriched: false }))
        setWineList(p => [...p, ...withMeta])
        setPhotos(p => p.map(x => x.id === ph.id ? { ...x, status: 'done', count: found.length } : x))
      } catch (err) {
        if (err.message === 'API ???놁쓬') alert('?숋툘 ?ㅼ젙?먯꽌 Claude API ?ㅻ? ?낅젰?댁＜?몄슂')
        setPhotos(p => p.map(x => x.id === ph.id ? { ...x, status: 'error' } : x))
      }
    }
    e.target.value = ''
  }

  async function runEnrich() {
    setEnriching(true); setEnrichProgress(0)
    const toEnrich = wineList.filter(w => !w._enriched && w.name && w.name !== '誘명솗??)
    for (let i = 0; i < toEnrich.length; i++) {
      const w = toEnrich[i]
      try {
        const q = w.vintage ? `${w.name} ${w.vintage}` : w.name
        const data = await callAI([{ role: 'user', content: `???"${q}"??Vivino쨌Wine-Searcher?먯꽌 寃?됲븯怨?JSON留? {"producer":"","region":"","country":"","grape":"","description":"?쒓뎅??臾몄옣","imageUrl":"","vivinoPrice":null,"vivinoRating":null,"wineSearcherPrice":null}` }], 600, [{ type: 'web_search_20250305', name: 'web_search' }])
        const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '{}'
        const info = JSON.parse(text.replace(/```json|```/g, '').trim())
        setWineList(p => p.map(x => x._id === w._id ? { ...x, ...info, _enriched: true } : x))
      } catch {}
      setEnrichProgress(Math.round((i + 1) / toEnrich.length * 100))
    }
    setEnriching(false)
  }

  const setField = (id, k, v) => setWineList(p => p.map(w => w._id === id ? { ...w, [k]: v } : w))
  const removeWine = id => setWineList(p => p.filter(w => w._id !== id))
  function confirm() { onAddMany(wineList.filter(w => w.name.trim() && w.name !== '誘명솗??).map(w => ({ ...w, id: uid() }))) }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 680, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: T.cream }}>?벜 ?ъ쭊?쇰줈 ?쇨큵 ?낅젰</h2>
            <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 4 }}>{['??移??좏깮', '???ъ쭊 ?낅줈??, '??寃??諛?異붽?'][step - 1]}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: '1.2rem' }}>??/button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {[1, 2, 3].map(n => <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= n ? T.gold : T.border }} />)}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.7, marginBottom: 20 }}>
              珥ъ쁺??<strong style={{ color: T.cream }}>??ъ? 移?踰덊샇</strong>瑜??좏깮?섏꽭?? ??移몄뵫 吏꾪뻾?⑸땲??
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
              <div><label style={lbl}>???/label><select value={cellarId} onChange={e => { setCellarId(e.target.value); setSlot('1') }}>{CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={lbl}>移?踰덊샇</label><select value={slot} onChange={e => setSlot(e.target.value)}>{getSlots(curCellar).map(s => <option key={s} value={s}>{s}踰?移?/option>)}</select></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Btn variant="gold" onClick={() => setStep(2)}>?ㅼ쓬 ??/Btn></div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={{ background: T.surface, border: `2px dashed ${T.border}`, borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>?벝</div>
              <div style={{ fontSize: '0.875rem', color: T.text, marginBottom: 4 }}><strong style={{ color: T.cream }}>{cellarById(cellarId)?.name} 쨌 {slot}踰?移?/strong> ????ъ쭊</div>
              <div style={{ fontSize: '0.78rem', color: T.muted, marginBottom: 16 }}>?щ윭 ???좏깮 媛??쨌 ?쇰꺼????蹂댁씪?섎줉 ?뺥솗?⑸땲??/div>
              <label style={{ display: 'inline-block', background: T.gold, color: T.bg, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                ?벜 ?ъ쭊 ?좏깮 / 珥ъ쁺
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
                        {ph.status === 'pending' && <span style={{ color: T.muted }}>?湲?以?..</span>}
                        {ph.status === 'scanning' && <span style={{ color: T.gold }}>?뵇 遺꾩꽍 以?..</span>}
                        {ph.status === 'done' && <span style={{ color: '#4a8a5e' }}>??{ph.count}醫??몄떇</span>}
                        {ph.status === 'error' && <span style={{ color: '#c0392b' }}>???몄떇 ?ㅽ뙣</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="ghost" onClick={() => setStep(1)}>???댁쟾</Btn>
              <Btn variant="gold" onClick={() => setStep(3)} style={{ opacity: wineList.length > 0 ? 1 : 0.4 }} disabled={wineList.length === 0}>
                {wineList.length > 0 ? `寃?좏븯湲?(${wineList.length}醫? ?? : '?ъ쭊???낅줈?쒗븯?몄슂'}
              </Btn>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.82rem', color: T.muted }}>
                <span style={{ color: T.cream, fontWeight: 600 }}>{wineList.length}醫?/span> ?몄떇 ??                <span style={{ color: T.gold }}> {cellarById(cellarId)?.name} 쨌 {slot}踰?移?/span>
              </div>
              <button onClick={runEnrich} disabled={enriching} style={{ background: enriching ? T.muted : T.surface, color: enriching ? T.bg : T.gold, border: `1px solid ${T.gold}44`, cursor: enriching ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem' }}>
                {enriching ? `?뵇 寃??以?.. ${enrichProgress}%` : '?뵇 AI濡?媛寃㈑룹젙蹂?寃??}
              </button>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {wineList.map(w => (
                <div key={w._id} style={{ background: T.surface, border: `1px solid ${w._enriched ? T.gold + '44' : T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 36, height: 52, background: T.card, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', border: `1px solid ${T.border}` }}>?뜼</div>}
                    <div style={{ flex: 1 }}>
                      <input value={w.name} onChange={e => setField(w._id, 'name', e.target.value)} style={{ marginBottom: 6, fontWeight: 500, fontSize: '0.875rem' }} placeholder="????대쫫" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        <input value={w.vintage || ''} onChange={e => setField(w._id, 'vintage', e.target.value ? parseInt(e.target.value) : null)} type="number" placeholder="鍮덊떚吏" style={{ fontSize: '0.8rem' }} />
                        <input value={w.qty} onChange={e => setField(w._id, 'qty', parseInt(e.target.value) || 1)} type="number" min="1" style={{ fontSize: '0.8rem' }} placeholder="?섎웾" />
                        <input value={w.price || ''} onChange={e => setField(w._id, 'price', e.target.value)} type="number" placeholder="援щℓ媛 ?? style={{ fontSize: '0.8rem' }} />
                      </div>
                      {w._enriched && <div style={{ marginTop: 5, fontSize: '0.72rem', color: T.muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {w.producer && <span>{w.producer}</span>}
                        {w.region && <span>{w.region}</span>}
                        {w.grape && <span>?뜃 {w.grape}</span>}
                        {(w.vivinoPrice || w.wineSearcherPrice) && <span style={{ color: T.gold }}>${w.vivinoPrice && w.wineSearcherPrice ? Math.round((w.vivinoPrice + w.wineSearcherPrice) / 2) : (w.vivinoPrice || w.wineSearcherPrice)}</span>}
                      </div>}
                    </div>
                    <button onClick={() => removeWine(w._id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', flexShrink: 0 }}>??/button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Btn variant="ghost" onClick={() => setStep(2)}>???ㅻ줈</Btn>
              <Btn variant="gold" onClick={confirm}>?뜼 {wineList.filter(w => w.name.trim() && w.name !== '誘명솗??).length}嫄??꾩껜 異붽?</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

