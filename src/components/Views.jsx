import { useState } from 'react'
import { CELLARS, cellarById, T, krw, kdate, getDrinkingStatus, callAI, bottleBadge, normalizeWineText, nameFingerprint } from '../config/cellars.js'
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
export function ListView({ wines, openDetail, openDrink, goSlot, onDeleteMany, onRename, onMerge }) {
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
              // 지문(핵심 이름) 기준 정렬 — 같은 생산자/와인의 형제(예: Dom Pérignon …)가 인접하게 모인다.
              // 지문이 같으면 표시 이름순으로 안정 정렬.
              const groupList = Object.entries(groups).sort((a, b) =>
                a[0].localeCompare(b[0], 'ko') || (a[1][0].name || '').localeCompare(b[1][0].name || '', 'ko'))
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
                          {(() => {
                            // 수준 3: 빈티지·셀러·칸까지 같은 진짜 중복 레코드를 한 줄로 묶는다
                            const clusterMap = {}
                            items.forEach(w => {
                              const key = `${w.name}|${w.vintage || ''}|${w.cellarId}|${w.slot}`
                              ;(clusterMap[key] = clusterMap[key] || []).push(w)
                            })
                            const clusters = Object.values(clusterMap)
                            const dupCount = clusters.filter(cl => cl.length > 1).length
                            return (
                              <>
                                {dupCount > 0 && (
                                  <div style={{ fontSize: '0.72rem', color: T.gold, marginBottom: 6 }}>
                                    🔁 빈티지·위치까지 같은 중복 {dupCount}건 — 한 레코드로 병합할 수 있습니다
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {clusters.map(cl => {
                                    const w = cl[0]
                                    const c = cellarById(w.cellarId)
                                    const willChange = multiName && w.name !== chosen
                                    const dup = cl.length > 1
                                    const clQty = cl.reduce((s, x) => s + (x.qty || 1), 0)
                                    return (
                                      <div key={w.id} onClick={() => openDetail(w.id)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', background: dup ? T.gold + '11' : 'transparent' }}
                                        onMouseEnter={e => e.currentTarget.style.background = dup ? T.gold + '22' : T.surface}
                                        onMouseLeave={e => e.currentTarget.style.background = dup ? T.gold + '11' : 'transparent'}
                                      >
                                        <span style={{ flex: 1, minWidth: 0, color: willChange ? T.wineLight : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {willChange && <span title="통일 시 이 이름이 바뀝니다" style={{ marginRight: 4 }}>✏️</span>}
                                          {dup && <span title="빈티지·위치까지 같은 중복 레코드" style={{ marginRight: 4, color: T.gold }}>🔁</span>}
                                          {w.name}{bottleBadge(w.bottleSize) ? ` ${bottleBadge(w.bottleSize)}` : ''}
                                          {dup && <span style={{ color: T.muted, fontSize: '0.72rem', marginLeft: 6 }}>({cl.length}개 레코드)</span>}
                                        </span>
                                        <span style={{ color: T.gold, width: 46, textAlign: 'right', flexShrink: 0 }}>{w.vintage || '??'}</span>
                                        <span style={{ color: T.text, width: 38, textAlign: 'right', flexShrink: 0 }}>{clQty}병</span>
                                        <span style={{ color: T.muted, width: 130, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c?.name} {w.slot}칸</span>
                                        {dup && (
                                          <button onClick={e => { e.stopPropagation(); onMerge && onMerge(cl.map(x => x.id)) }}
                                            title={`${cl.length}개 레코드를 1개(${clQty}병)로 병합`}
                                            style={{ background: T.gold, color: T.bg, border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                            🔗 병합
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            )
                          })()}
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

  // ── 컬렉션 가치 평가 ──────────────────────────────────────────
  const WINE_TYPE_LABEL = { red: '레드', white: '화이트', sparkling: '스파클링', rose: '로제', 'rosé': '로제', dessert: '디저트', fortified: '주정강화', orange: '오렌지' }

  // 1) 셀러별 가치 (수익률은 구매가·시장가 모두 있는 와인만)
  const cellarValues = CELLARS.map(c => {
    const cw = wines.filter(w => w.cellarId === c.id)
    const purchase = cw.reduce((s, w) => s + (w.price || 0) * (w.qty || 1), 0)
    const market   = cw.reduce((s, w) => s + (w.wineSearcherPrice || 0) * (w.qty || 1), 0)
    const bottles  = cw.reduce((s, w) => s + (w.qty || 1), 0)
    const cv  = cw.filter(w => (w.price || 0) > 0 && (w.wineSearcherPrice || 0) > 0)
    const cvP = cv.reduce((s, w) => s + w.price * (w.qty || 1), 0)
    const cvM = cv.reduce((s, w) => s + w.wineSearcherPrice * (w.qty || 1), 0)
    const rate = cvP > 0 ? (cvM - cvP) / cvP * 100 : null
    return { c, purchase, market, bottles, rate }
  })

  // 2) 보유 가치 TOP 와인 (시장가 병당 × 수량)
  const topValue = wines
    .filter(w => (w.wineSearcherPrice || 0) > 0)
    .map(w => ({ w, total: w.wineSearcherPrice * (w.qty || 1) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // 3) 평가차익 상위/하위 (구매가·시장가 모두 있는 와인만, % 기준)
  const gainList = wines
    .filter(w => (w.price || 0) > 0 && (w.wineSearcherPrice || 0) > 0)
    .map(w => ({ w, gain: (w.wineSearcherPrice - w.price) * (w.qty || 1), rate: (w.wineSearcherPrice - w.price) / w.price * 100 }))
  const topGain = [...gainList].sort((a, b) => b.rate - a.rate).slice(0, 3)
  const topLoss = [...gainList].sort((a, b) => a.rate - b.rate).filter(x => x.rate < 0).slice(0, 3)

  // 4) 타입·국가별 시장가 분포
  const byType = {}, byCountry = {}
  wines.forEach(w => {
    const v = (w.wineSearcherPrice || 0) * (w.qty || 1)
    if (v <= 0) return
    const t  = WINE_TYPE_LABEL[w.wineType] || w.wineType || '미분류'
    const co = w.country || '미분류'
    byType[t]   = (byType[t] || 0) + v
    byCountry[co] = (byCountry[co] || 0) + v
  })
  const typeList    = Object.entries(byType).sort((a, b) => b[1] - a[1])
  const countryList = Object.entries(byCountry).sort((a, b) => b[1] - a[1])
  const distTotal   = totalMarket

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

      {/* ── 컬렉션 가치 평가 ── */}
      {totalMarket > 0 && (
        <>
          <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.15rem', color:T.gold, margin:'24px 0 12px' }}>💰 컬렉션 가치 평가</h2>

          <Card title="셀러별 가치">
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {cellarValues.map(({ c, purchase, market, bottles, rate }) => (
                <div key={c.id} style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1.3fr 1fr 1fr 0.7fr', gap:8, alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:'0.85rem', color:T.cream, fontWeight:600 }}>{c.name}<span style={{ color:T.muted, fontWeight:400, fontSize:'0.72rem', marginLeft:6 }}>{bottles}병</span></div>
                  <div style={{ fontSize:'0.76rem', color:T.muted }}>구매가 <span style={{ color:T.text }}>{krw(purchase)}</span></div>
                  <div style={{ fontSize:'0.76rem', color:T.muted }}>시장가 <span style={{ color:T.gold, fontWeight:600 }}>{krw(market)}</span></div>
                  <div style={{ fontSize:'0.82rem', fontWeight:700, textAlign: mobile?'left':'right', color: rate==null ? T.muted : rate>=0 ? '#4a8a5e' : '#c0392b' }}>{rate==null ? '-' : `${rate>=0?'+':''}${rate.toFixed(1)}%`}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="보유 가치 TOP 5 (시장가 기준)">
            {topValue.length === 0 ? <div style={{ color:T.muted, fontSize:'0.82rem' }}>시장가가 등록된 와인이 없습니다</div> :
              topValue.map(({ w, total }, i) => (
                <div key={w.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<topValue.length-1?`1px solid ${T.border}`:'none' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:i===0?T.gold:T.surface, border:`1px solid ${i===0?T.gold:T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:i===0?T.bg:T.muted, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.85rem', color:T.cream, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}{w.vintage?` ${w.vintage}`:''}</div>
                    <div style={{ fontSize:'0.7rem', color:T.muted }}>병당 {krw(w.wineSearcherPrice)} × {w.qty||1}병</div>
                  </div>
                  <div style={{ fontSize:'0.88rem', color:T.gold, fontWeight:700, flexShrink:0 }}>{krw(total)}</div>
                </div>
              ))
            }
          </Card>

          {gainList.length > 0 && (
            <Card title="평가차익 상위 / 하위">
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:16 }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'#4a8a5e', fontWeight:600, marginBottom:8 }}>📈 가장 많이 오른</div>
                  {topGain.map(({ w, rate }) => (
                    <div key={w.id} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'5px 0', fontSize:'0.8rem' }}>
                      <span style={{ color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}{w.vintage?` ${w.vintage}`:''}</span>
                      <span style={{ color:'#4a8a5e', fontWeight:700, flexShrink:0 }}>+{rate.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'#c0392b', fontWeight:600, marginBottom:8 }}>📉 가장 많이 내린</div>
                  {topLoss.length===0 ? <div style={{ fontSize:'0.78rem', color:T.muted }}>하락한 와인 없음</div> :
                    topLoss.map(({ w, rate }) => (
                      <div key={w.id} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'5px 0', fontSize:'0.8rem' }}>
                        <span style={{ color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}{w.vintage?` ${w.vintage}`:''}</span>
                        <span style={{ color:'#c0392b', fontWeight:700, flexShrink:0 }}>{rate.toFixed(0)}%</span>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div style={{ fontSize:'0.68rem', color:T.muted, marginTop:10 }}>※ 구매가·시장가가 모두 등록된 와인만 비교합니다.</div>
            </Card>
          )}

          <Card title="타입·국가별 가치 분포">
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ fontSize:'0.72rem', color:T.muted, marginBottom:8 }}>타입별</div>
                {typeList.length===0 ? <div style={{ fontSize:'0.78rem', color:T.muted }}>-</div> :
                  typeList.map(([k, v]) => (
                    <div key={k} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.76rem', marginBottom:3 }}><span style={{ color:T.cream }}>{k}</span><span style={{ color:T.gold }}>{krw(v)} ({distTotal>0?Math.round(v/distTotal*100):0}%)</span></div>
                      <div style={{ height:6, background:T.surface, borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', borderRadius:3, background:`linear-gradient(90deg,${T.wine},${T.gold})`, width:`${distTotal>0?v/distTotal*100:0}%` }} /></div>
                    </div>
                  ))
                }
              </div>
              <div>
                <div style={{ fontSize:'0.72rem', color:T.muted, marginBottom:8 }}>국가별</div>
                {countryList.length===0 ? <div style={{ fontSize:'0.78rem', color:T.muted }}>-</div> :
                  countryList.slice(0, 6).map(([k, v]) => (
                    <div key={k} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.76rem', marginBottom:3 }}><span style={{ color:T.cream }}>{k}</span><span style={{ color:T.gold }}>{krw(v)} ({distTotal>0?Math.round(v/distTotal*100):0}%)</span></div>
                      <div style={{ height:6, background:T.surface, borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', borderRadius:3, background:`linear-gradient(90deg,${T.goldDim},${T.gold})`, width:`${distTotal>0?v/distTotal*100:0}%` }} /></div>
                    </div>
                  ))
                }
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Drinking Window View (음용 적기) ──────────────────────────────
// 전체 와인을 음용 적기 status별로 그룹화해 우선순위대로 보여준다.
// 같은 와인(name+vintage)은 "이름 + N병"으로 한 줄에 합쳐 표시한다.

// AI 음용시기 추정 — callAI(=callProxy) 경유. JSON만 반환받아 마지막 완성 객체를 파싱.
async function estimateDrinkingWindow(wine) {
  const vintageNote = wine.vintage
    ? `빈티지 ${wine.vintage}년`
    : '빈티지 정보 없음 — 해당 타입/품종 와인의 일반적인 권장 음용 기간으로 추정'
  const prompt = `와인 "${wine.name}"${wine.vintage ? ` ${wine.vintage}` : ''}의 음용 적기(마시기 좋은 기간)를 추정하여 JSON만 반환 (마크다운/설명 없이):
{"drinkingFrom":null,"drinkingTo":null}

- drinkingFrom: 마시기 좋은 시작 연도 (4자리 숫자)
- drinkingTo: 마시기 좋은 마지막 연도 (4자리 숫자)
- ${vintageNote}
- 와인 타입/품종/생산지역과 일반적인 숙성 잠재력을 고려해 추정
- 정말 모르면 null
응답의 마지막은 반드시 완성된 JSON 객체 하나여야 한다.`
  const data = await callAI(
    [{ role: 'user', content: prompt }],
    2000,
    [{ type: 'web_search_20250305', name: 'web_search' }]
  )
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
  const cleaned = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
  // 완성된 JSON 객체들 중 마지막 것을 사용
  const candidates = cleaned.match(/\{[^{}]*\}/g)
  if (candidates) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      try { return JSON.parse(candidates[i]) } catch { /* 다음 후보 */ }
    }
  }
  console.warn('[DrinkingWindow] JSON 추출 실패:', text.slice(0, 300))
  return null
}

// status → 표시 섹션 매핑 (위에서부터의 우선순위 순)
const DW_SECTIONS = [
  { key: 'decline', title: '빨리 마셔야',   icon: '⚪', color: T.muted,   desc: '음용 적기가 지났거나 우선 소비 권장' },
  { key: 'peak',    title: '지금 절정',     icon: '🟢', color: '#4a8a5e', desc: '지금 마시기 가장 좋은 상태' },
  { key: 'ready',   title: '마시기 좋음',   icon: '🟢', color: '#4a8a5e', desc: '충분히 즐길 수 있는 상태' },
  { key: 'soon',    title: '곧 절정 진입',  icon: '🔵', color: '#5b8dd9', desc: '음용 적기 진입을 앞둔 와인' },
  { key: 'aging',   title: '숙성 중',       icon: '🔵', color: '#5b8dd9', desc: '아직 숙성이 필요한 와인' },
]

function dwSectionKey(status) {
  if (!status) return 'aging'
  if (status.status === 'decline') return 'decline'
  if (status.status === 'peak')    return 'peak'
  if (status.status === 'ready')   return 'ready'
  // young — 명시적 음용시기(from)가 있으면 곧 절정 진입, 빈티지 추정이면 숙성 중
  if (status.status === 'young')   return status.from ? 'soon' : 'aging'
  return 'aging'
}

export function DrinkingWindowView({ wines, openDetail, onUpdate }) {
  const [estimating, setEstimating] = useState(null) // 추정 중인 그룹 key

  // 같은 와인(name+vintage) 묶기
  const groupsMap = {}
  wines.forEach(w => {
    const key = `${(w.name || '').trim()}|||${w.vintage || ''}`
    if (!groupsMap[key]) groupsMap[key] = { key, rep: w, items: [], qty: 0 }
    groupsMap[key].items.push(w)
    groupsMap[key].qty += (w.qty || 1)
  })

  // 섹션별 그룹 분류
  const bySection = {}
  DW_SECTIONS.forEach(s => { bySection[s.key] = [] })
  Object.values(groupsMap).forEach(g => {
    const status = getDrinkingStatus(g.rep)
    g.status = status
    bySection[dwSectionKey(status)].push(g)
  })

  // 추정 가능 여부 — 빈티지·drinkingFrom·drinkingTo 모두 없음
  const canEstimate = (w) => !w.vintage && !w.drinkingFrom && !w.drinkingTo

  async function handleEstimate(group) {
    setEstimating(group.key)
    try {
      const info = await estimateDrinkingWindow(group.rep)
      if (info && (info.drinkingFrom || info.drinkingTo)) {
        for (const w of group.items) {
          await onUpdate(w.id, {
            drinkingFrom: info.drinkingFrom || null,
            drinkingTo:   info.drinkingTo || null,
          })
        }
      } else {
        alert('음용시기를 추정하지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
    } catch (e) {
      console.error('[DrinkingWindow] 추정 실패:', e)
      alert('추정 실패: ' + (e.message || e))
    }
    setEstimating(null)
  }

  const totalGroups = Object.values(groupsMap).length

  return (
    <div className="fade-in">
      <h1 className="heading">⏰ 음용 적기</h1>
      <p className="subheading">마셔야 할 순서대로 — 빨리 마셔야 할 와인이 맨 위입니다</p>

      {totalGroups === 0
        ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍷</div><div>와인이 없습니다 — 추가해볼까요?</div></div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {DW_SECTIONS.map(sec => {
              const groups = bySection[sec.key]
              if (!groups || groups.length === 0) return null
              // 그룹 내 정렬: 빈티지 오래된 순(빈티지 없으면 뒤로), 이름순
              const sortedGroups = [...groups].sort((a, b) =>
                (a.rep.vintage || 9999) - (b.rep.vintage || 9999) ||
                (a.rep.name || '').localeCompare(b.rep.name || '', 'ko'))
              const totalBottles = groups.reduce((s, g) => s + g.qty, 0)
              return (
                <div key={sec.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${sec.color}44` }}>
                    <span style={{ fontSize: '1.1rem' }}>{sec.icon}</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: sec.color }}>{sec.title}</span>
                    <span style={{ fontSize: '0.74rem', color: T.muted }}>· {groups.length}종 {totalBottles}병</span>
                    <span style={{ fontSize: '0.7rem', color: T.muted, marginLeft: 'auto', display: 'none' }} className="dw-desc">{sec.desc}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sortedGroups.map(g => {
                      const w = g.rep
                      const s = g.status
                      const c = cellarById(w.cellarId)
                      const showEstimate = canEstimate(w)
                      const isEstimating = estimating === g.key
                      return (
                        <div key={g.key} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '13px 16px', display: 'flex', gap: 14, alignItems: 'center', transition: 'border-color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = sec.color}
                          onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                        >
                          <div onClick={() => openDetail(w.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
                            {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 38, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 38, height: 54, background: T.surface, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: `1px solid ${T.border}` }}>🍷</div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {w.name}{bottleBadge(w.bottleSize) ? <span style={{ color: T.wineLight, fontWeight: 600, marginLeft: 6 }}>{bottleBadge(w.bottleSize)}</span> : null}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                {w.vintage ? <span style={{ color: T.gold }}>{w.vintage}</span> : <span>빈티지 미상</span>}
                                <span style={{ color: T.cream }}>{g.qty}병</span>
                                {c && <span>{c.name} {w.slot}칸{g.items.length > 1 ? ' 외' : ''}</span>}
                                {s?.from && <span>음용 적기 {s.from}~{s.to}년</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            {s && <span style={{ fontSize: '0.72rem', color: s.color, background: s.color + '22', borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>{s.icon} {s.label}</span>}
                            {showEstimate && (
                              <button onClick={() => handleEstimate(g)} disabled={isEstimating}
                                style={{ background: isEstimating ? T.surface : T.gold + '22', color: T.gold, border: `1px solid ${T.gold}44`, borderRadius: 7, padding: '5px 10px', fontSize: '0.72rem', cursor: isEstimating ? 'default' : 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {isEstimating ? '🔮 추정 중…' : '🔮 음용시기 추정'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
