import { useState } from 'react'
import { CELLARS, cellarById, T, krw, kdate, getDrinkingStatus, callAI, bottleBadge } from '../config/cellars.js'
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

// 이름 "지문" — 등급·수식어와 타입/지역 꼬리표를 걷어낸 핵심 이름. 같은 와인의 다른 표기를 같은 값으로 모은다.
// 예: "Château Margaux Grand Vin Premier Grand Cru Classé" → "chateau margaux"
//     "Deutz Brut Classic Champagne" 와 "Deutz Brut Classic" → 둘 다 "deutz brut classic"
// 주의: Brut/Rosé/Classic/Sec 등 제품을 실제로 구분하는 단어는 일부러 남긴다 (잘못 묶이지 않도록).
const NAME_STOPWORDS = [
  'grand vin de', 'grand vin', 'premier grand cru classe', 'premier grand cru',
  'grand cru classe', 'premier cru classe', 'deuxieme cru classe', 'troisieme cru classe',
  'grand cru', 'premier cru', '1er cru', '1er grand cru classe', '1er grand cru',
  'mis en bouteille au chateau', 'mis en bouteille', 'appellation controlee',
  'appellation contrôlée', 'appellation', 'product of france', 'red wine', 'white wine',
  // 타입/거품 종류/지역 꼬리표 — 같은 와인에 붙었다 안 붙었다 하는 단어들
  'sparkling wine', 'sparkling', 'champagne', 'cremant', 'crémant', 'cava', 'prosecco',
]
function nameFingerprint(name) {
  let s = ` ${normalizeWineText(name)} `
  // 단어 단위로만 제거 (앞뒤 공백 기준) — 다른 단어 일부가 잘리지 않도록
  for (const w of NAME_STOPWORDS) s = s.split(` ${normalizeWineText(w)} `).join(' ')
  return s.replace(/\s+/g, ' ').trim()
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
                      {w.vintage && <span style={{ color: T.gold }}>{w.vintage}</span>}{bottleBadge(w.bottleSize) && <span style={{ color: T.wineLight, fontWeight: 600 }}>{bottleBadge(w.bottleSize)}</span>}
                      <span>{w.qty || 1}병</span>
                      {w.price > 0 && <span>구매가 {krw(w.price)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {w.wineSearcherPrice > 0
                      ? <div style={{ fontSize: '0.95rem', fontWeight: 700, color: T.gold, lineHeight: 1 }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 500, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 6 }}>시장가</span>
                          {krw(w.wineSearcherPrice)}
                        </div>
                      : <div style={{ fontSize: '0.7rem', color: T.muted }}>시장가 미등록</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openDrink(w)} style={{ background: T.wine + '33', color: T.wineLight, border: `1px solid ${T.wine}`, padding: '6px 10px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer' }}>마심</button>
                      <button onClick={() => goSlot(w.cellarId, w.slot)} style={{ background: T.gold + '33', color: T.gold, border: `1px solid ${T.gold}`, padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>📍 {c?.name} {w.slot}칸</button>
                    </div>
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
export function ListView({ wines, openDetail, openDrink, goSlot, onDeleteMany, onRename }) {
  const mobile = useIsMobile()
  const [sort, setSort] = useState('name')
  const [filterCellar, setFilterCellar] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [priceUpdating, setPriceUpdating] = useState(false)
  const [priceProgress, setPriceProgress] = useState({ current: 0, total: 0, name: '' })
  const [priceUpdateDone, setPriceUpdateDone] = useState(false)
  const [groupSimilar, setGroupSimilar] = useState(false)  // 비슷한 이름 묶기 모드
  const [chosenNames, setChosenNames] = useState({})        // 지문 → 통일할 이름

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

  // 단일 와인 가격 검색 — pause_turn 이어가기 + 견고한 JSON 추출
  async function searchOnePrice(apiKey, q) {
    const prompt = `와인 "${q}"의 가격을 검색하여 JSON만 반환 (마크다운 없이):
{"wineSearcherPrice":null,"vivinoPrice":null,"vivinoRating":null}

가격 수집 방법 (750ml 기준):
- wine-searcher.com 한국(Korea) KRW 가격 조회
- dailyshot.co.kr KRW 가격 조회
- vivino.com USD 가격 조회 후 현재 환율로 KRW 환산

세 가격 중 가장 높은 KRW → wineSearcherPrice
vivino USD 원본 → vivinoPrice
숫자만, 모르면 null
응답의 마지막은 반드시 완성된 JSON 객체 하나여야 한다.`
    let messages = [{ role: 'user', content: prompt }]
    for (let attempt = 0; attempt < 4; attempt++) {
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
          max_tokens: 2000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages,
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `HTTP ${res.status}`)
      }
      const data = await res.json()
      // 웹 검색 중 턴이 일시정지되면 대화를 이어서 재호출
      if (data.stop_reason === 'pause_turn') {
        messages = [...messages, { role: 'assistant', content: data.content }]
        continue
      }
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
      const cleaned = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
      // 완성된 JSON 객체들 중 마지막 것을 사용 (앞쪽 설명 텍스트 무시)
      const candidates = cleaned.match(/\{[^{}]*\}/g)
      if (candidates) {
        for (let i = candidates.length - 1; i >= 0; i--) {
          try { return JSON.parse(candidates[i]) } catch { /* 다음 후보 */ }
        }
      }
      console.warn('[PriceUpdate] JSON 추출 실패. stop_reason:', data.stop_reason, '응답:', text.slice(0, 300))
      return null
    }
    return null
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
    let ok = 0, fail = 0
    for (let i = 0; i < targets.length; i++) {
      const w = targets[i]
      setPriceProgress({ current: i + 1, total: targets.length, name: w.name })
      try {
        const q = w.vintage ? `${w.name} ${w.vintage}` : w.name
        const info = await searchOnePrice(apiKey, q)
        if (info && (info.wineSearcherPrice || info.vivinoPrice || info.vivinoRating)) {
          // App.jsx의 updateWine 대신 직접 wines 배열 업데이트를 위해 onUpdate 필요
          // wines prop을 통해 직접 업데이트할 수 없으므로 커스텀 이벤트로 처리
          window.dispatchEvent(new CustomEvent('cave:priceUpdate', { detail: { id: w.id, ...info } }))
          ok++
        } else {
          fail++
          console.warn('[PriceUpdate] 가격 못 찾음:', w.name)
        }
      } catch(e) { fail++; console.error('[PriceUpdate]', w.name, e) }
      await new Promise(r => setTimeout(r, 2000))
    }
    setPriceUpdating(false)
    setPriceUpdateDone(true)
    if (fail > 0) alert(`시장가 업데이트: 성공 ${ok}건 / 실패 ${fail}건\n실패 목록은 브라우저 콘솔(F12)에서 확인할 수 있습니다.`)
    setTimeout(() => setPriceUpdateDone(false), 4000)
  }

  const COLS = '28px 48px 1.6fr 72px 56px 140px 130px'

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
          <button onClick={() => setGroupSimilar(g => !g)} title="이름이 조금씩 다른 같은 와인을 묶어서 정리" style={{ background: groupSimilar ? T.gold : T.surface, color: groupSimilar ? T.bg : T.gold, border: `1px solid ${T.gold}66`, borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
            🔗 비슷한 이름 묶기{groupSimilar ? ' ✓' : ''}
          </button>
        </div>
      </div>

      {sorted.length === 0
        ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍷</div><div>와인이 없습니다 — 추가해볼까요?</div></div>
        : groupSimilar
          ? (() => {
              // 지문(등급·수식어 제거)이 같은 와인끼리 그룹화
              const groups = {}
              sorted.forEach(w => {
                const fp = nameFingerprint(w.name) || (w.name || '').trim()
                ;(groups[fp] = groups[fp] || []).push(w)
              })
              // 항목 수 많은 그룹 우선, 그 다음 이름순
              const groupList = Object.entries(groups).sort((a, b) =>
                b[1].length - a[1].length || (a[1][0].name || '').localeCompare(b[1][0].name || '', 'ko'))
              const mixedCount = groupList.filter(([, items]) => new Set(items.map(w => w.name)).size > 1).length
              return (
                <div className="fade-in">
                  <div style={{ fontSize: '0.78rem', color: T.muted, marginBottom: 14, lineHeight: 1.5 }}>
                    이름이 조금씩 다른 같은 와인을 묶었습니다.
                    {mixedCount > 0
                      ? <> 표기가 갈린 <span style={{ color: T.gold }}>{mixedCount}개 그룹</span>은 이름을 하나로 통일할 수 있습니다.</>
                      : ' 표기가 갈린 그룹은 없습니다.'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {groupList.map(([fp, items]) => {
                      const names = [...new Set(items.map(w => w.name))]
                      const bottles = items.reduce((s, w) => s + (w.qty || 1), 0)
                      const multiName = names.length > 1
                      const chosen = chosenNames[fp] ?? [...names].sort((a, b) => a.length - b.length)[0]
                      return (
                        <div key={fp} style={{ background: T.card, border: `1px solid ${multiName ? T.gold + '66' : T.border}`, borderRadius: 12, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: multiName ? 12 : 8 }}>
                            <div style={{ fontSize: '0.9rem', color: T.cream, fontWeight: 600, minWidth: 0 }}>
                              {chosen} <span style={{ color: T.muted, fontWeight: 400, fontSize: '0.76rem' }}>· {items.length}항목 {bottles}병</span>
                            </div>
                            {multiName && (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <select value={chosen} onChange={e => setChosenNames(p => ({ ...p, [fp]: e.target.value }))} style={{ width: 'auto', fontSize: '0.76rem', padding: '5px 8px', maxWidth: 280 }}>
                                  {names.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <button onClick={() => onRename && onRename(items.filter(w => w.name !== chosen).map(w => w.id), chosen)}
                                  style={{ background: T.gold, color: T.bg, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  이 이름으로 통일
                                </button>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {items.map(w => {
                              const c = cellarById(w.cellarId)
                              const willChange = multiName && w.name !== chosen
                              return (
                                <div key={w.id} onClick={() => openDetail(w.id)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}
                                  onMouseEnter={e => e.currentTarget.style.background = T.surface}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span style={{ flex: 1, minWidth: 0, color: willChange ? T.wineLight : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {willChange && <span title="통일 시 이 이름이 바뀝니다" style={{ marginRight: 4 }}>✏️</span>}
                                    {w.name}{bottleBadge(w.bottleSize) ? ` ${bottleBadge(w.bottleSize)}` : ''}
                                  </span>
                                  <span style={{ color: T.gold, width: 46, textAlign: 'right', flexShrink: 0 }}>{w.vintage || '??'}</span>
                                  <span style={{ color: T.text, width: 38, textAlign: 'right', flexShrink: 0 }}>{w.qty || 1}병</span>
                                  <span style={{ color: T.muted, width: 130, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c?.name} {w.slot}칸</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()
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
                          {w.vintage && <span style={{ color: T.gold }}>{w.vintage}</span>}{bottleBadge(w.bottleSize) && <span style={{ color: T.wineLight, fontWeight: 600 }}>{bottleBadge(w.bottleSize)}</span>}
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
                <span style={{ textAlign: 'right', color: '#C9A84C' }}>시장가(₩)</span>
                <span>셀러 · 위치</span>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                        {bottleBadge(w.bottleSize) && <span style={{ fontSize: '0.7rem', color: T.wineLight, fontWeight: 600, flexShrink: 0 }}>{bottleBadge(w.bottleSize)}</span>}
                      </div>
                      {w.notes && <div style={{ fontSize: '0.7rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.notes}</div>}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: T.gold, fontWeight: 500, textAlign: 'center' }}>{w.vintage || '??'}</span>
                    <span style={{ fontSize: '0.875rem', color: T.text, textAlign: 'right' }}>{w.qty || 1}병</span>
                    <span style={{ fontSize: '0.875rem', color: w.wineSearcherPrice ? T.gold : T.muted, fontWeight: w.wineSearcherPrice ? 600 : 400, textAlign: 'right' }}>{w.wineSearcherPrice ? krw(w.wineSearcherPrice) : '-'}</span>
                    <div onClick={e => { e.stopPropagation(); goSlot(w.cellarId, w.slot) }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: T.surface, borderRadius: 8, padding: '5px 10px', border: `1px solid ${T.border}`, transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.gold}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                    >
                      <div style={{ fontSize: '0.9rem' }}>📍</div>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: T.cream, whiteSpace: 'nowrap' }}>{c?.name}</div>
                        <div style={{ fontSize: '0.65rem', color: T.gold }}>{w.slot}번 칸</div>
                      </div>
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
  const [confirmId, setConfirmId] = useState(null)
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  {confirmId === r.id
                    ? <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#c0392b22', border: '1px solid #c0392b', borderRadius: 8, padding: '4px 10px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#e07070' }}>이 기록을 삭제할까요?</span>
                        <button onClick={() => { onDelete(r.id); setConfirmId(null) }} style={{ background: '#c0392b', color: 'white', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>확인</button>
                        <button onClick={() => setConfirmId(null)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>취소</button>
                      </div>
                    : <button onClick={() => setConfirmId(r.id)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e07070'; e.currentTarget.style.borderColor = '#c0392b' }}
                        onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border }}
                      >🗑 삭제</button>
                  }
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

  // 평가 차익·수익률은 구매가·시장가가 모두 있는 와인만 비교 (한쪽만 있으면 왜곡되므로 제외)
  const valued         = wines.filter(w => (w.price||0) > 0 && (w.wineSearcherPrice||0) > 0)
  const valuedBottles  = valued.reduce((s,w) => s + (w.qty||1), 0)
  const valuedPurchase = valued.reduce((s,w) => s + w.price*(w.qty||1), 0)
  const valuedMarket   = valued.reduce((s,w) => s + w.wineSearcherPrice*(w.qty||1), 0)
  const valuedGain     = valuedMarket - valuedPurchase
  const profitRate     = valuedPurchase > 0 ? (valuedGain / valuedPurchase * 100) : 0

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
            ['평가 차익', valuedGain>=0 ? '+'+krw(valuedGain) : krw(valuedGain)],
            ['수익률', `${profitRate>=0?'+':''}${profitRate.toFixed(1)}%`],
          ].map(([k,v]) => (
            <div key={k} style={{ background:T.surface, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:'0.66rem', color:T.muted, marginBottom:5 }}>{k}</div>
              <div style={{ fontSize:'0.95rem', fontWeight:600, color: (k==='평가 차익'||k==='수익률') ? (valuedGain>=0?'#4a8a5e':'#c0392b') : T.cream }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:'0.68rem', color:T.muted, marginTop:12, lineHeight:1.5 }}>
          ※ 평가 차익·수익률은 구매가와 시장가가 모두 등록된 {valued.length}종({valuedBottles}병) 기준입니다.
          {valued.length < wines.length && ' 시장가나 구매가가 비어 있는 와인은 비교에서 제외됩니다.'}
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
