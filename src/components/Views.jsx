import { useState } from 'react'
import { CELLARS, cellarById, T, krw, kdate, getDrinkingStatus } from '../config/cellars.js'
import { useIsMobile } from './ui.jsx'

// ── Search View ─────────────────────────────────────────────────
export function SearchView({ wines, openDetail, openDrink, goSlot }) {
  const [q, setQ] = useState('')
  const results = q.trim() ? wines.filter(w =>
    (w.name || '').toLowerCase().includes(q.toLowerCase()) ||
    String(w.vintage || '').includes(q.trim())
  ) : []

  return (
    <div className="fade-in">
      <h1 className="heading">와인 검색</h1>
      <p className="subheading">이름 · 빈티지로 검색</p>
      <div style={{ maxWidth: 520, marginBottom: 28, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="와인 이름 또는 빈티지..." autoFocus style={{ paddingLeft: 40, height: 50, fontSize: '1rem' }} />
        {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.muted, fontSize: '1.1rem' }}>✕</button>}
      </div>
      {!q.trim() && <div style={{ textAlign: 'center', padding: '48px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍷</div><div>이름이나 빈티지를 입력하세요</div></div>}
      {q.trim() && results.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0', color: T.muted }}>"{q}"에 해당하는 와인이 없습니다</div>}
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
                  {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 40, height: 56, background: T.surface, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🍷</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: T.cream, marginBottom: 4 }}>{w.name}</div>
                    <div style={{ fontSize: '0.78rem', color: T.muted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {w.vintage && <span style={{ color: T.gold }}>{w.vintage}</span>}
                      <span>{w.qty || 1}병</span><span>{krw(w.price)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openDrink(w)} style={{ background: T.wine + '33', color: T.wineLight, border: `1px solid ${T.wine}`, padding: '6px 10px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer' }}>마심</button>
                    <button onClick={() => goSlot(w.cellarId, w.slot)} style={{ background: T.gold + '22', color: T.gold, border: `1px solid ${T.gold}44`, padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>📍 {c?.name} {w.slot}번</button>
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

// ── List View ───────────────────────────────────────────────────
export function ListView({ wines, openDetail, openDrink, goSlot }) {
  const mobile = useIsMobile()
  const [sort, setSort] = useState('name')
  const [filterCellar, setFilterCellar] = useState('')

  const sorted = [...wines]
    .filter(w => !filterCellar || w.cellarId === filterCellar)
    .sort((a, b) => {
      if (sort === 'name')    return (a.name || '').localeCompare(b.name || '', 'ko')
      if (sort === 'vintage') return (b.vintage || 0) - (a.vintage || 0)
      if (sort === 'price')   return (b.price || 0) - (a.price || 0)
      if (sort === 'date')    return new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0)
      return 0
    })

  const COLS = '48px 2fr 72px 56px 110px 110px 96px'

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="heading">전체 목록</h1>
          <p style={{ color: T.muted, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            {sorted.length}건 · {sorted.reduce((s, w) => s + (w.qty || 1), 0)}병
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterCellar} onChange={e => setFilterCellar(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
            <option value="">전체 셀러</option>
            {CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
            <option value="name">이름순</option><option value="vintage">빈티지순</option>
            <option value="price">가격순</option><option value="date">구매일순</option>
          </select>
        </div>
      </div>

      {sorted.length === 0
        ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍷</div><div>와인을 추가해주세요</div></div>
        : mobile
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sorted.map(w => {
                const c = cellarById(w.cellarId)
                return (
                  <div key={w.id} onClick={() => openDetail(w.id)} style={{ display: 'flex', gap: 12, alignItems: 'center', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                    {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 40, height: 56, background: T.surface, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: `1px solid ${T.border}` }}>🍷</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                      <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {w.vintage && <span style={{ color: T.gold }}>{w.vintage}</span>}
                        <span>{w.qty || 1}병</span>
                        {w.price > 0 && <span>{krw(w.price)}</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: 2 }}>{c?.name} · {w.slot}번 칸</div>
                    </div>
                  </div>
                )
              })}
            </div>
          : <>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '8px 14px', fontSize: '0.68rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${T.border}` }}>
                <span/><span>와인명</span><span style={{ textAlign: 'center' }}>빈티지</span><span style={{ textAlign: 'right' }}>수량</span><span style={{ textAlign: 'right' }}>구매가</span><span>구매일</span><span>위치</span>
              </div>
              {sorted.map(w => {
                const c = cellarById(w.cellarId)
                return (
                  <div key={w.id} onClick={() => openDetail(w.id)} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.12s', borderBottom: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.card}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 36, height: 50, background: T.surface, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🍷</div>}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                      {w.notes && <div style={{ fontSize: '0.7rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.notes}</div>}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: T.gold, fontWeight: 500, textAlign: 'center' }}>{w.vintage || '—'}</span>
                    <span style={{ fontSize: '0.875rem', color: T.text, textAlign: 'right' }}>{w.qty || 1}병</span>
                    <span style={{ fontSize: '0.875rem', color: T.text, textAlign: 'right' }}>{krw(w.price)}</span>
                    <span style={{ fontSize: '0.78rem', color: T.muted }}>{kdate(w.purchaseDate)}</span>
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

// ── Drink Log View ──────────────────────────────────────────────
export function DrinkLogView({ drinkLog, onDelete }) {
  const [filter, setFilter] = useState('')
  const sorted = [...drinkLog].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
  const filtered = filter ? sorted.filter(r => (r.wineName || '').toLowerCase().includes(filter.toLowerCase()) || (r.companions || '').toLowerCase().includes(filter.toLowerCase())) : sorted

  return (
    <div className="fade-in">
      <h1 className="heading">음주 기록</h1>
      <p className="subheading">총 {drinkLog.length}번의 기록</p>

      {drinkLog.length > 0 && (
        <div style={{ maxWidth: 400, marginBottom: 20, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="와인 이름 또는 함께한 사람..." style={{ paddingLeft: 34 }} />
        </div>
      )}

      {drinkLog.length === 0
        ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🥂</div><div style={{ marginBottom: 6 }}>음주 기록이 없습니다</div><div style={{ fontSize: '0.8rem' }}>셀러 뷰에서 와인 옆 "마심" 버튼을 누르세요</div></div>
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
                          {r.cellarName && <span style={{ fontSize: '0.78rem', color: T.muted }}>{r.cellarName} · {r.slot}번 칸</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: T.cream }}>{kdate(r.date)}</div>
                        {r.rating > 0 && (
                          <div style={{ marginTop: 3, color: T.gold }}>
                            {'★'.repeat(r.rating)}<span style={{ color: T.border }}>{'★'.repeat(5 - r.rating)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: r.review ? 10 : 0 }}>
                      {r.companions && <span style={{ fontSize: '0.82rem', color: T.text }}>👥 {r.companions}</span>}
                      {r.occasion && <span style={{ fontSize: '0.82rem', color: T.text }}>🎉 {r.occasion}</span>}
                    </div>
                    {r.review && <div style={{ background: T.surface, borderRadius: 8, padding: '10px 12px', borderLeft: `2px solid ${T.gold}` }}><p style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.6, fontStyle: 'italic' }}>"{r.review}"</p></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Statistics View ─────────────────────────────────────────────
export function StatisticsView({ wines, drinkLog }) {
  const mobile = useIsMobile()
  const krw = n => n ? '₩' + Number(n).toLocaleString('ko-KR') : '-'
  const year = new Date().getFullYear()

  // 월별 음주 통계
  const monthlyData = {}
  drinkLog.forEach(r => {
    if (!r.date) return
    const ym = r.date.substring(0, 7)
    monthlyData[ym] = (monthlyData[ym] || 0) + 1
  })
  const months = Object.entries(monthlyData).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 12)

  // 가장 많이 마신 와인
  const wineCount = {}
  drinkLog.forEach(r => { wineCount[r.wineName] = (wineCount[r.wineName] || 0) + 1 })
  const topWines = Object.entries(wineCount).sort((a,b) => b[1]-a[1]).slice(0, 5)

  // 함께한 사람
  const companionCount = {}
  drinkLog.forEach(r => {
    if (!r.companions) return
    r.companions.split(/[,，、\s]+/).filter(Boolean).forEach(c => {
      companionCount[c.trim()] = (companionCount[c.trim()] || 0) + 1
    })
  })
  const topCompanions = Object.entries(companionCount).sort((a,b) => b[1]-a[1]).slice(0, 5)

  // 평균 평점
  const rated = drinkLog.filter(r => r.rating > 0)
  const avgRating = rated.length ? (rated.reduce((s,r) => s+r.rating, 0) / rated.length).toFixed(1) : '-'

  // 셀러 가치
  const totalPurchase = wines.reduce((s,w) => s + (w.price||0)*(w.qty||1), 0)
  const totalMarket   = wines.reduce((s,w) => s + (w.wineSearcherPrice||0)*(w.qty||1), 0)
  const totalBottles  = wines.reduce((s,w) => s + (w.qty||1), 0)

  const Card = ({ title, children }) => (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
      <div style={{ fontSize:'0.75rem', color:T.gold, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14, fontWeight:600 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div className="fade-in">
      <h1 className="heading">통계</h1>
      <p className="subheading">셀러 가치 · 음주 패턴 분석</p>

      {/* 셀러 가치 요약 */}
      <Card title="💰 셀러 가치">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
          {[
            ['총 보유 병 수', `${totalBottles}병`],
            ['총 와인 종류', `${wines.length}종`],
            ['구매가 합계', krw(totalPurchase)],
            ['시장가 합계', krw(totalMarket)],
            ['평가 차익', totalMarket>totalPurchase ? '+'+krw(totalMarket-totalPurchase) : krw(totalMarket-totalPurchase)],
            ['평균 병당 가치', krw(Math.round(totalMarket/totalBottles)||0)],
          ].map(([k,v]) => (
            <div key={k} style={{ background:T.surface, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:'0.66rem', color:T.muted, marginBottom:5 }}>{k}</div>
              <div style={{ fontSize:'0.95rem', fontWeight:600, color: k==='평가 차익'&&totalMarket>totalPurchase?'#4a8a5e':T.cream }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 음주 요약 */}
      <Card title="🍷 음주 요약">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12 }}>
          {[
            ['총 음주 횟수', `${drinkLog.length}번`],
            ['평균 평점', `${avgRating}점`],
            ['올해 음주', `${drinkLog.filter(r=>r.date?.startsWith(String(year))).length}번`],
          ].map(([k,v]) => (
            <div key={k} style={{ background:T.surface, borderRadius:8, padding:'10px 12px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:'0.66rem', color:T.muted, marginBottom:5 }}>{k}</div>
              <div style={{ fontSize:'0.95rem', fontWeight:600, color:T.cream }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 월별 음주 */}
      {months.length > 0 && (
        <Card title="📅 월별 음주 횟수">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {months.map(([ym, cnt]) => {
              const max = Math.max(...months.map(m=>m[1]))
              return (
                <div key={ym} style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ fontSize:'0.78rem', color:T.muted, width:60, flexShrink:0 }}>{ym}</div>
                  <div style={{ flex:1, background:T.surface, borderRadius:4, height:20, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,${T.wine},${T.gold})`, width:`${cnt/max*100}%`, display:'flex', alignItems:'center', paddingLeft:8 }}>
                      <span style={{ fontSize:'0.7rem', color:T.cream, fontWeight:600 }}>{cnt}번</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* 자주 마신 와인 */}
      {topWines.length > 0 && (
        <Card title="🏆 자주 마신 와인 TOP 5">
          {topWines.map(([name, cnt], i) => (
            <div key={name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<topWines.length-1?`1px solid ${T.border}`:'none' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?T.gold:T.surface, border:`1px solid ${i===0?T.gold:T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:i===0?T.bg:T.muted, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, fontSize:'0.88rem', color:T.cream }}>{name}</div>
              <div style={{ fontSize:'0.82rem', color:T.gold, fontWeight:600 }}>{cnt}번</div>
            </div>
          ))}
        </Card>
      )}

      {/* 함께한 사람 */}
      {topCompanions.length > 0 && (
        <Card title="👥 함께한 사람 TOP 5">
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
