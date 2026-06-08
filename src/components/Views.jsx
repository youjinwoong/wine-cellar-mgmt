import { useState } from 'react'
import { CELLARS, cellarById, T, krw, kdate, getDrinkingStatus, callAI } from '../config/cellars.js'
import { useIsMobile } from './ui.jsx'

// ── 다국어 동의어 사전 ───────────────────────────────────────────
const SYNONYMS = [
  // 샤또 마고
  ['chateau margaux', 'château margaux', '샤또 마고', '샤토 마고', 'margaux'],
  // 라피트 로칠드
  ['chateau lafite rothschild', 'château lafite rothschild', '샤또 라피트 로칠드', '라피트 로칠드', 'lafite', 'lafite rothschild'],
  // 무통 로칠드
  ['chateau mouton rothschild', 'château mouton rothschild', '샤또 무통 로칠드', '무통 로칠드', 'mouton rothschild'],
  // 라투르
  ['chateau latour', 'château latour', '샤또 라투르', '라투르', 'grand vin de château latour', 'grand vin de chateau latour'],
  // 오브리옹
  ['chateau haut-brion', 'château haut-brion', '샤또 오브리옹', '오브리옹', 'haut brion'],
  // 오퍼스 원
  ['opus one', '오퍼스 원', '오퍼스원'],
  // 페트뤼스
  ['petrus', 'pétrus', '페트뤼스', '페트루스'],
  // 이켐
  ["chateau d'yquem", "château d'yquem", '샤또 디켐', '디켐', 'yquem'],
  // 시라/쉬라즈
  ['shiraz', 'syrah', '시라', '쉬라', '쉬라즈'],
  // 피노누아
  ['pinot noir', '피노 누아', '피노누아'],
  // 카베르네 소비뇽
  ['cabernet sauvignon', '카베르네 소비뇽', '카베르네소비뇽', 'cab sauv'],
  // 소비뇽 블랑
  ['sauvignon blanc', '소비뇽 블랑', '소비뇽블랑'],
  // 샤르도네
  ['chardonnay', '샤르도네', '샤도네이'],
  // 리슬링
  ['riesling', '리슬링'],
  // 말벡
  ['malbec', '말벡'],
  // 메를로
  ['merlot', '메를로', '메를롯'],
  // 그르나슈
  ['grenache', 'garnacha', '그르나슈', '가르나차'],
  // 로마네 콩티
  ['romanee-conti', 'romanée-conti', '로마네 콩티', '로마네콩티', 'drc'],
  // 부르고뉴
  ['bourgogne', 'burgundy', '부르고뉴', '버건디'],
  // 보르도
  ['bordeaux', '보르도'],
  // 캐이머스
  ['caymus', '케이머스', '카이머스'],
  // 모에 샹동
  ['moet chandon', 'moët & chandon', 'moet & chandon', '모에 샹동', '모에샹동'],
]

function normalizeWineText(text) {
  if (!text) return ''
  return text.toLowerCase()
    .replace(/château/gi, 'chateau')
    .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e')
    .replace(/à/g, 'a').replace(/â/g, 'a')
    .replace(/ô/g, 'o').replace(/î/g, 'i')
    .replace(/[·•\-]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function wineMatchesQuery(wine, query) {
  if (!query.trim()) return false
  const q = normalizeWineText(query)
  const fields = [wine.name, wine.producer, wine.region, wine.country, wine.grape, wine.description, String(wine.vintage || '')]
  
  // 1. 직접 매칭
  const directMatch = fields.some(f => normalizeWineText(f).includes(q))
  if (directMatch) return true

  // 2. 동의어 매칭
  const qGroup = SYNONYMS.find(group => group.some(s => normalizeWineText(s) === q || q.includes(normalizeWineText(s)) || normalizeWineText(s).includes(q)))
  if (qGroup) {
    return fields.some(f => {
      const nf = normalizeWineText(f)
      return qGroup.some(s => nf.includes(normalizeWineText(s)))
    })
  }
  return false
}

// ── Search View ──────────────────────────────────────────────────
export function SearchView({ wines, openDetail, openDrink, goSlot }) {
  const [q, setQ] = useState('')
  const results = q.trim() ? wines.filter(w => wineMatchesQuery(w, q)) : []

  return (
    <div className="fade-in">
      <h1 className="heading">검색</h1>
      <p className="subheading">와인 이름, 빈티지로 검색하세요</p>
      <div style={{ maxWidth: 520, marginBottom: 28, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="와인 이름, 빈티지 검색..." autoFocus style={{ paddingLeft: 40, height: 50, fontSize: '1rem' }} />
        {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.muted, fontSize: '1.1rem' }}>✕</button>}
      </div>
      {!q.trim() && <div style={{ textAlign: 'center', padding: '48px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div><div>검색어를 입력하세요</div></div>}
      {q.trim() && results.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0', color: T.muted }}>"{q}"와 일치하는 와인이 없습니다</div>}
      {results.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', color: T.muted, marginBottom: 12 }}>{results.length}개 결과</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map(w => {
              const c = cellarById(w.cellarId)
              return (
                <div key={w.id} onClick={() => openDetail(w.id)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.gold}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                >
                  {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 40, height: 56, background: T.surface, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', border: `1px solid ${T.border}` }}>🍷</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                    <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {w.vintage && <span style={{ color: T.gold }}>{w.vintage}</span>}
                      <span>{w.qty || 1}병</span>
                      {w.price > 0 && <span>{krw(w.price)}</span>}
                      {w.wineSearcherPrice > 0 && <span style={{ color: T.gold, fontWeight: 600 }}>시장가 {krw(w.wineSearcherPrice)}</span>}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: 2 }}>{c?.name} · {w.slot}번 칸</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openDrink(w)} style={{ background: T.wine + '33', color: T.wineLight, border: `1px solid ${T.wine}`, padding: '6px 10px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer' }}>마심</button>
                    <button onClick={() => goSlot(w.cellarId, w.slot)} style={{ background: T.gold + '22', color: T.gold, border: `1px solid ${T.gold}44`, padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>📍 {c?.name} {w.slot}칸</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── List View ────────────────────────────────────────────────────
export function ListView({ wines, openDetail, openDrink, goSlot, onDeleteMany }) {
  const mobile = useIsMobile()
  const [sort, setSort] = useState('name')
  const [filterCellar, setFilterCellar] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [priceUpdating, setPriceUpdating] = useState(false)
  const [priceProgress, setPriceProgress] = useState({ current: 0, total: 0, name: '' })
  const [priceUpdateDone, setPriceUpdateDone] = useState(false)

  const sorted = [...wines]
    .filter(w => !filterCellar || w.cellarId === filterCellar)
    .sort((a, b) => {
      if (sort === 'name')    return (a.name || '').localeCompare(b.name || '', 'ko')
      if (sort === 'vintage') return (b.vintage || 0) - (a.vintage || 0)
      if (sort === 'price')   return (b.price || 0) - (a.price || 0)
      if (sort === 'market')  return (b.wineSearcherPrice || 0) - (a.wineSearcherPrice || 0)
      if (sort === 'date')    return new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0)
      return 0
    })

  const allSelected = sorted.length > 0 && sorted.every(w => selected.has(w.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map(w => w.id)))
    }
  }
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBulkDelete() {
    await onDeleteMany([...selected])
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  async function handleBulkPriceUpdate(forceAll = false) {
    const targets = forceAll ? sorted : sorted.filter(w => !w.wineSearcherPrice)
    if (targets.length === 0) {
      alert('시장가가 없는 와인이 없습니다.')
      return
    }
    const apiKey = localStorage.getItem('cave_anthropic_key')?.trim()
    if (!apiKey) { alert('⚙️ 설정에서 Claude API 키를 먼저 입력해주세요!'); return }
    setPriceUpdating(true)
    setPriceUpdateDone(false)
    for (let i = 0; i < targets.length; i++) {
      const w = targets[i]
      setPriceProgress({ current: i + 1, total: targets.length, name: w.name })
      try {
        const q = w.vintage ? `${w.name} ${w.vintage}` : w.name
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 800,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{ role: 'user', content:
              `와인 "${q}"의 가격을 검색하여 JSON만 반환 (마크다운 없이):
와인 "${q}"의 가격을 검색하여 JSON만 반환 (마크다운 없이):
{"wineSearcherPrice":null,"vivinoPrice":null,"vivinoRating":null}

가격 수집 방법 (750ml 기준):
- wine-searcher.com 한국(Korea) KRW 가격 조회
- dailyshot.co.kr KRW 가격 조회
- vivino.com USD 가격 조회 후 현재 환율로 KRW 환산

세 가격 중 가장 높은 KRW → wineSearcherPrice
vivino USD 원본 → vivinoPrice
숫자만, 모르면 null` }]
          })
        })
        const data = await res.json()
        const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '{}'
        const cleaned = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (match) {
          const info = JSON.parse(match[0])
          if (info.wineSearcherPrice || info.vivinoPrice) {
            // App.jsx의 updateWine 대신 직접 wines 배열 업데이트를 위해 onUpdate 필요
            // wines prop을 통해 직접 업데이트할 수 없으므로 커스텀 이벤트로 처리
            window.dispatchEvent(new CustomEvent('cave:priceUpdate', { detail: { id: w.id, ...info } }))
          }
        }
      } catch(e) { console.error('[PriceUpdate]', w.name, e) }
      await new Promise(r => setTimeout(r, 2000))
    }
    setPriceUpdating(false)
    setPriceUpdateDone(true)
    setTimeout(() => setPriceUpdateDone(false), 4000)
  }

  const COLS = '28px 48px 2fr 72px 56px 120px 120px 96px'

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="heading">보관 목록</h1>
          <p style={{ color: T.muted, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            총 {sorted.length}종 {sorted.reduce((s, w) => s + (w.qty || 1), 0)}병
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 선택 삭제 버튼 */}
          {selected.size > 0 && (
            confirmBulkDelete ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#c0392b22', border: '1px solid #c0392b', borderRadius: 8, padding: '6px 12px' }}>
                <span style={{ fontSize: '0.78rem', color: '#e07070' }}>{selected.size}개 삭제?</span>
                <button onClick={handleBulkDelete} style={{ background: '#c0392b', color: 'white', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>확인</button>
                <button onClick={() => setConfirmBulkDelete(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', cursor: 'pointer' }}>취소</button>
              </div>
            ) : (
              <button onClick={() => setConfirmBulkDelete(true)} style={{ background: '#c0392b22', color: '#e07070', border: '1px solid #c0392b44', borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer' }}>
                🗑 선택 삭제 ({selected.size}개)
              </button>
            )
          )}
          {/* 시장가 일괄 업데이트 */}
          {priceUpdating ? (
            <div style={{ background: T.gold + '22', border: `1px solid ${T.gold}66`, borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem', color: T.gold, minWidth: 200 }}>
              💰 {priceProgress.current}/{priceProgress.total} — {priceProgress.name.slice(0, 15)}{priceProgress.name.length > 15 ? '...' : ''}
            </div>
          ) : priceUpdateDone ? (
            <div style={{ background: '#4a8a5e22', border: '1px solid #4a8a5e', borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem', color: '#4a8a5e' }}>✓ 시장가 업데이트 완료</div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => handleBulkPriceUpdate(false)} style={{ background: T.gold + '22', color: T.gold, border: `1px solid ${T.gold}44`, borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                💰 시장가 업데이트
              </button>
              <button onClick={() => handleBulkPriceUpdate(true)} style={{ background: T.wine + '22', color: '#e07070', border: `1px solid ${T.wine}`, borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                🔄 전체 재검색
              </button>
            </div>
          )}
          <select value={filterCellar} onChange={e => setFilterCellar(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
            <option value="">전체 셀러</option>
            {CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
            <option value="name">이름순</option>
            <option value="vintage">빈티지순</option>
            <option value="price">구매가순</option>
            <option value="market">시장가순</option>
            <option value="date">구매일순</option>
          </select>
        </div>
      </div>

      {sorted.length === 0
        ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍷</div><div>와인이 없습니다 — 추가해볼까요?</div></div>
        : mobile
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sorted.map(w => {
                const c = cellarById(w.cellarId)
                const isSelected = selected.has(w.id)
                return (
                  <div key={w.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(w.id)}
                      style={{ width: 16, height: 16, accentColor: T.gold, flexShrink: 0, cursor: 'pointer' }} />
                    <div onClick={() => openDetail(w.id)} style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'center', background: isSelected ? T.gold + '11' : T.card, border: `1px solid ${isSelected ? T.gold + '66' : T.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 40, height: 56, background: T.surface, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: `1px solid ${T.border}` }}>🍷</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                        <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {w.vintage && <span style={{ color: T.gold }}>{w.vintage}</span>}
                          <span>{w.qty || 1}병</span>
                          {w.price > 0 && <span>{krw(w.price)}</span>}
                          {w.wineSearcherPrice > 0 && <span style={{ color: T.gold }}>시장가 {krw(w.wineSearcherPrice)}</span>}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: 2 }}>{c?.name} 셀러 {w.slot}번 칸</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          : <>
              {/* 테이블 헤더 */}
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '8px 14px', fontSize: '0.68rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    style={{ width: 15, height: 15, accentColor: T.gold, cursor: 'pointer' }} />
                </div>
                <span></span>
                <span>이름</span>
                <span style={{ textAlign: 'center' }}>빈티지</span>
                <span style={{ textAlign: 'right' }}>수량</span>
                <span style={{ textAlign: 'right' }}>구매가</span>
                <span style={{ textAlign: 'right', color: '#C9A84C' }}>시장가(₩)</span>
                <span>위치</span>
              </div>
              {sorted.map(w => {
                const c = cellarById(w.cellarId)
                const isSelected = selected.has(w.id)
                return (
                  <div key={w.id} onClick={() => openDetail(w.id)} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s', background: isSelected ? T.gold + '11' : 'transparent', border: `1px solid ${isSelected ? T.gold + '44' : 'transparent'}`, marginBottom: 2 }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.card }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" checked={isSelected}
                        onClick={e => e.stopPropagation()}
                        onChange={() => toggleOne(w.id)}
                        style={{ width: 15, height: 15, accentColor: T.gold, cursor: 'pointer' }} />
                    </div>
                    {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 36, height: 50, background: T.surface, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🍷</div>}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                      {w.notes && <div style={{ fontSize: '0.7rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.notes}</div>}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: T.gold, fontWeight: 500, textAlign: 'center' }}>{w.vintage || '??'}</span>
                    <span style={{ fontSize: '0.875rem', color: T.text, textAlign: 'right' }}>{w.qty || 1}병</span>
                    <span style={{ fontSize: '0.875rem', color: T.text, textAlign: 'right' }}>{krw(w.price) || '-'}</span>
                    <span style={{ fontSize: '0.875rem', color: w.wineSearcherPrice ? T.gold : T.muted, fontWeight: w.wineSearcherPrice ? 600 : 400, textAlign: 'right' }}>{w.wineSearcherPrice ? krw(w.wineSearcherPrice) : '-'}</span>
                    <div onClick={e => { e.stopPropagation(); goSlot(w.cellarId, w.slot) }} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: T.cream }}>{c?.name}</div>
                      <div style={{ fontSize: '0.68rem', color: T.muted }}>{w.slot}번 칸</div>
                    </div>
                  </div>
                )
              })}
            </>
      }
    </div>
  )
}

// ── Drink Log View ───────────────────────────────────────────────
export function DrinkLogView({ drinkLog, onDelete }) {
  const [filter, setFilter] = useState('')
  const sorted = [...drinkLog].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
  const filtered = filter ? sorted.filter(r => (r.wineName || '').toLowerCase().includes(filter.toLowerCase()) || (r.companions || '').toLowerCase().includes(filter.toLowerCase())) : sorted

  return (
    <div className="fade-in">
      <h1 className="heading">🍷 음주 기록</h1>
      <p className="subheading">지금까지 {drinkLog.length}번의 와인을 즐겼습니다</p>
      {drinkLog.length > 0 && (
        <div style={{ maxWidth: 400, marginBottom: 20, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="와인 이름, 함께한 사람 검색..." style={{ paddingLeft: 34 }} />
        </div>
      )}
      {drinkLog.length === 0
        ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍷</div><div>아직 음주 기록이 없습니다</div><div style={{ fontSize: '0.8rem', marginTop: 6 }}>와인을 마시면 여기에 기록됩니다</div></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(r => (
              <div key={r.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, position: 'relative' }}>
                <button onClick={() => onDelete(r.id)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.85rem', padding: '4px 8px', borderRadius: 6 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                  onMouseLeave={e => e.currentTarget.style.color = T.muted}
                >✕</button>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: 44, height: 62, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 44, height: 62, background: T.surface, borderRadius: 6, border: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🍷</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: T.cream }}>{r.wineName}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                          {r.wineVintage && <span style={{ fontSize: '0.78rem', color: T.gold }}>{r.wineVintage}</span>}
                          {r.cellarName && <span style={{ fontSize: '0.78rem', color: T.muted }}>{r.cellarName} 셀러 {r.slot}번 칸</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: T.cream }}>{kdate(r.date)}</div>
                        {r.rating > 0 && (
                          <div style={{ marginTop: 3, color: T.gold }}>
                            {'⭐'.repeat(r.rating)}<span style={{ color: T.border }}>{'⭐'.repeat(5 - r.rating)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: r.review ? 10 : 0 }}>
                      {r.companions && <span style={{ fontSize: '0.82rem', color: T.text }}>👥 {r.companions}</span>}
                      {r.occasion && <span style={{ fontSize: '0.82rem', color: T.text }}>🎉 {r.occasion}</span>}
                    </div>
                    {r.review && <div style={{ background: T.surface, borderRadius: 8, padding: '10px 12px', borderLeft: `2px solid ${T.gold}` }}><p style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.6, fontStyle: 'italic' }}>{r.review}</p></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Statistics View ──────────────────────────────────────────────
export function StatisticsView({ wines, drinkLog }) {
  const mobile = useIsMobile()
  const krw = n => n ? '₩' + Number(n).toLocaleString('ko-KR') : '-'
  const year = new Date().getFullYear()

  const monthlyData = {}
  drinkLog.forEach(r => {
    if (!r.date) return
    const ym = r.date.substring(0, 7)
    monthlyData[ym] = (monthlyData[ym] || 0) + 1
  })
  const months = Object.entries(monthlyData).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 12)

  const wineCount = {}
  drinkLog.forEach(r => { wineCount[r.wineName] = (wineCount[r.wineName] || 0) + 1 })
  const topWines = Object.entries(wineCount).sort((a,b) => b[1]-a[1]).slice(0, 5)

  const companionCount = {}
  drinkLog.forEach(r => {
    if (!r.companions) return
    r.companions.split(/[,，、\s]+/).filter(Boolean).forEach(c => {
      companionCount[c.trim()] = (companionCount[c.trim()] || 0) + 1
    })
  })
  const topCompanions = Object.entries(companionCount).sort((a,b) => b[1]-a[1]).slice(0, 5)

  const rated = drinkLog.filter(r => r.rating > 0)
  const avgRating = rated.length ? (rated.reduce((s,r) => s+r.rating, 0) / rated.length).toFixed(1) : '-'

  const totalPurchase = wines.reduce((s,w) => s + (w.price||0)*(w.qty||1), 0)
  const totalMarket   = wines.reduce((s,w) => s + (w.wineSearcherPrice||0)*(w.qty||1), 0)
  const totalBottles  = wines.reduce((s,w) => s + (w.qty||1), 0)

  const Card = ({ title, children }) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
      <div style={{ fontSize:'0.75rem', color:T.gold, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14, fontWeight:600 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div className="fade-in">
      <h1 className="heading">통계</h1>
      <p className="subheading">나의 와인 라이프 — 한눈에 보기</p>

      <Card title="셀러 현황">
        <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fit,minmax(140px,1fr))`, gap:12 }}>
          {[
            ['총 보관 병 수', `${totalBottles}병`],
            ['와인 기록 수', `${wines.length}종`],
            ['구매가 합계', krw(totalPurchase)],
            ['시장가 합계', krw(totalMarket)],
            ['평가 차익', totalMarket>totalPurchase ? '+'+krw(totalMarket-totalPurchase) : krw(totalMarket-totalPurchase)],
            ['수익률', `${krw(Math.round(totalMarket/totalBottles||0))}`],
          ].map(([k,v]) => (
            <div key={k} style={{ background:T.surface, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:'0.66rem', color:T.muted, marginBottom:5 }}>{k}</div>
              <div style={{ fontSize:'0.95rem', fontWeight:600, color: k==='평가 차익'&&totalMarket>totalPurchase?'#4a8a5e':T.cream }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="음주 기록 요약">
        <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fit,minmax(120px,1fr))`, gap:12 }}>
          {[
            ['총 음주 횟수', `${drinkLog.length}번`],
            ['평균 평점', `${avgRating}점`],
            [`${year}년 음주`, `${drinkLog.filter(r=>r.date?.startsWith(String(year))).length}번`],
          ].map(([k,v]) => (
            <div key={k} style={{ background:T.surface, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:'0.66rem', color:T.muted, marginBottom:5 }}>{k}</div>
              <div style={{ fontSize:'0.95rem', fontWeight:600, color:T.cream }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {months.length > 0 && (
        <Card title="월별 음주 횟수 (최근 12개월)">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {months.map(([ym, cnt]) => {
              const max = Math.max(...months.map(m=>m[1]))
              return (
                <div key={ym} style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ fontSize:'0.78rem', color:T.muted, width:60, flexShrink:0 }}>{ym}</div>
                  <div style={{ flex:1, height:'100%', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:20, borderRadius:4, background:`linear-gradient(90deg,${T.wine},${T.gold})`, width:`${cnt/max*100}%`, display:'flex', alignItems:'center', paddingLeft:8 }}>
                      <span style={{ fontSize:'0.7rem', color:T.cream, fontWeight:600 }}>{cnt}번</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {topWines.length > 0 && (
        <Card title="제일 많이 마신 와인 TOP 5">
          {topWines.map(([name, cnt], i) => (
            <div key={name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<topWines.length-1?`1px solid ${T.border}`:'none' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?T.gold:T.surface, border:`1px solid ${i===0?T.gold:T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', color:i===0?T.bg:T.muted, fontWeight:700 }}>{i+1}</div>
              <div style={{ flex:1, fontSize:'0.88rem', color:T.cream }}>{name}</div>
              <div style={{ fontSize:'0.82rem', color:T.gold, fontWeight:600 }}>{cnt}번</div>
            </div>
          ))}
        </Card>
      )}

      {topCompanions.length > 0 && (
        <Card title="함께 마신 TOP 5">
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {topCompanions.map(([name, cnt]) => (
              <div key={name} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:'6px 14px', display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:'0.82rem', color:T.cream }}>{name}</span>
                <span style={{ fontSize:'0.72rem', color:T.gold, fontWeight:600 }}>{cnt}번</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
