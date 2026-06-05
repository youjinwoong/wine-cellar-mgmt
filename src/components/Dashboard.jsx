import { useMemo } from 'react'
import { CELLARS, getSlots, T, krw, getDrinkingStatus } from '../config/cellars.js'
import { useIsMobile } from './ui.jsx'

export default function Dashboard({ wines, drinkLog, bottlesIn, setTab, setCellarId }) {
  const mobile = useIsMobile()
  const year = new Date().getFullYear()

  const totalBottles   = wines.reduce((s, w) => s + (w.qty || 1), 0)
  const purchaseValue  = wines.reduce((s, w) => s + (w.price || 0) * (w.qty || 1), 0)
  const marketValue    = wines.reduce((s, w) => s + (w.wineSearcherPrice || 0) * (w.qty || 1), 0)
  const usedSlots      = new Set(wines.map(w => `${w.cellarId}:${w.slot}`)).size
  const totalSlots     = CELLARS.reduce((s, c) => s + c.slots, 0)

  // 음용 적기 분류
  const drinkNow  = wines.filter(w => { const s = getDrinkingStatus(w); return s?.status === 'peak' })
  const tooYoung  = wines.filter(w => { const s = getDrinkingStatus(w); return s?.status === 'young' })
  const lowStock  = wines.filter(w => (w.qty || 1) <= 1)

  // 추천 와인 (지금 마시기 좋은 것 중 빈티지 오래된 순)
  const recommended = [...drinkNow].sort((a, b) => (a.vintage || 0) - (b.vintage || 0)).slice(0, 3)

  const stats = [
    { label: '총 와인 기록', val: `${wines.length}건`,   sub: '구매 기록 수' },
    { label: '총 보관 병 수', val: `${totalBottles}병`,  sub: `${usedSlots}/${totalSlots} 칸 사용` },
    { label: '구매가 합계',   val: krw(purchaseValue),   sub: '총 구매금액' },
    { label: '시장가 합계',   val: krw(marketValue),     sub: '현재 셀러 가치', onClick: () => setTab('stats') },
    { label: '음주 기록',     val: `${drinkLog.length}번`, sub: '마신 와인', onClick: () => setTab('log') },
  ]

  return (
    <div className="fade-in">
      <h1 className="heading">셀러 현황</h1>
      <p className="subheading">{new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })}</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${mobile?2:5},1fr)`, gap:10, marginBottom:24 }}>
        {stats.map(({ label, val, sub, onClick }) => (
          <div key={label} onClick={onClick} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:16, cursor:onClick?'pointer':'default', transition:'border-color 0.2s' }}
            onMouseEnter={onClick?e=>e.currentTarget.style.borderColor=T.gold:undefined}
            onMouseLeave={onClick?e=>e.currentTarget.style.borderColor=T.border:undefined}
          >
            <div style={{ fontSize:'0.68rem', color:T.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{label}</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.3rem', fontWeight:600, color:T.cream, marginBottom:4 }}>{val}</div>
            <div style={{ fontSize:'0.68rem', color:T.muted }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* 가치 비교 */}
      {marketValue > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.gold}44`, borderRadius:12, padding:18, marginBottom:24 }}>
          <div style={{ fontSize:'0.75rem', color:T.gold, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, fontWeight:600 }}>💰 셀러 가치 분석</div>
          <div style={{ display:'flex', gap:mobile?12:32, flexWrap:'wrap', alignItems:'center' }}>
            <div><div style={{ fontSize:'0.7rem', color:T.muted, marginBottom:4 }}>구매가 합계</div><div style={{ fontSize:'1.1rem', fontWeight:600, color:T.cream }}>{krw(purchaseValue)}</div></div>
            <div style={{ fontSize:'1.2rem', color:T.muted }}>→</div>
            <div><div style={{ fontSize:'0.7rem', color:T.muted, marginBottom:4 }}>현재 시장가 합계</div><div style={{ fontSize:'1.3rem', fontWeight:700, color:T.gold }}>{krw(marketValue)}</div></div>
            {marketValue > purchaseValue && (
              <div style={{ background:'#4a8a5e22', border:'1px solid #4a8a5e', borderRadius:8, padding:'6px 12px' }}>
                <div style={{ fontSize:'0.7rem', color:'#4a8a5e' }}>평가 차익</div>
                <div style={{ fontSize:'1rem', fontWeight:700, color:'#4a8a5e' }}>+{krw(marketValue - purchaseValue)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 알림 */}
      {(drinkNow.length > 0 || lowStock.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:mobile?'1fr':`repeat(${[drinkNow.length>0, lowStock.length>0].filter(Boolean).length},1fr)`, gap:12, marginBottom:24 }}>
          {drinkNow.length > 0 && (
            <div style={{ background:'#4a8a5e18', border:'1px solid #4a8a5e44', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:'0.72rem', color:'#4a8a5e', fontWeight:600, marginBottom:10 }}>🟢 지금 마시기 좋은 와인 ({drinkNow.length}종)</div>
              {drinkNow.slice(0,4).map(w => (
                <div key={w.id} style={{ fontSize:'0.8rem', color:T.cream, display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span>{w.name}</span>
                  <span style={{ color:T.gold }}>{w.vintage}</span>
                </div>
              ))}
            </div>
          )}
          {lowStock.length > 0 && (
            <div style={{ background:T.wine+'18', border:`1px solid ${T.wine}44`, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:'0.72rem', color:T.wineLight, fontWeight:600, marginBottom:10 }}>⚠️ 재고 1병 이하 ({lowStock.length}종)</div>
              {lowStock.slice(0,4).map(w => (
                <div key={w.id} style={{ fontSize:'0.8rem', color:T.cream, display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span>{w.name}</span>
                  <span style={{ color:T.wineLight }}>{w.qty || 1}병 남음</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 추천 와인 */}
      {recommended.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', color:T.cream, marginBottom:12 }}>⭐ 오늘의 추천 — 지금 마시기 좋은 와인</h2>
          <div style={{ display:'grid', gridTemplateColumns:mobile?'1fr':'repeat(3,1fr)', gap:12 }}>
            {recommended.map(w => {
              const s = getDrinkingStatus(w)
              return (
                <div key={w.id} style={{ background:T.card, border:`1px solid ${T.gold}44`, borderRadius:12, padding:16 }}>
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1rem', fontWeight:600, color:T.cream, marginBottom:4 }}>{w.name}</div>
                  <div style={{ color:T.gold, fontWeight:600, marginBottom:6 }}>{w.vintage}</div>
                  {s && <div style={{ fontSize:'0.72rem', color:s.color, background:s.color+'22', borderRadius:6, padding:'3px 8px', display:'inline-block', marginBottom:8 }}>{s.icon} {s.label}</div>}
                  {s?.from && <div style={{ fontSize:'0.7rem', color:T.muted }}>음용 적기: {s.from}~{s.to}년</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 셀러별 현황 */}
      <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.1rem', color:T.cream, marginBottom:14 }}>셀러별 현황</h2>
      <div style={{ display:'grid', gridTemplateColumns:mobile?'1fr':'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
        {CELLARS.map(c => {
          const slots    = getSlots(c)
          const cWines   = wines.filter(w => w.cellarId === c.id)
          const totalB   = cWines.reduce((s,w) => s + (w.qty||1), 0)
          const usedN    = slots.filter(s => bottlesIn(c.id, s) > 0).length
          const pct      = Math.round(totalB / (c.slots * c.maxPerSlot) * 100) || 0
          const mval     = cWines.reduce((s,w) => s + (w.wineSearcherPrice||0)*(w.qty||1), 0)
          return (
            <div key={c.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:20, cursor:'pointer', transition:'border-color 0.2s' }}
              onClick={() => { setCellarId(c.id); setTab('cellar') }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.gold}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'1.05rem', fontWeight:600, color:T.cream }}>{c.name}</div>
                  <div style={{ fontSize:'0.7rem', color:T.muted, marginTop:2 }}>{c.slots}칸 · 칸당 max {c.maxPerSlot}병</div>
                </div>
                <span style={{ background:T.gold+'22', color:T.gold, border:`1px solid ${T.gold}44`, borderRadius:4, padding:'2px 8px', fontSize:'0.7rem', fontWeight:600 }}>{pct}%</span>
              </div>
              <div style={{ background:T.surface, borderRadius:4, height:5, marginBottom:10, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,${T.wine},${T.gold})`, width:`${pct}%` }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                <div style={{ fontSize:'0.75rem', color:T.muted }}>보관 중 <strong style={{ color:T.cream }}>{totalB}병</strong></div>
                <div style={{ fontSize:'0.75rem', color:T.muted }}>사용 칸 <strong style={{ color:T.cream }}>{usedN}/{c.slots}</strong></div>
              </div>
              {mval > 0 && <div style={{ fontSize:'0.72rem', color:T.gold }}>셀러 시장가 {krw(mval)}</div>}
              <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:8 }}>
                {slots.map(s => {
                  const b = bottlesIn(c.id, s)
                  const r = b / c.maxPerSlot
                  return (
                    <div key={s} style={{ display:'flex', gap:4, alignItems:'center' }}>
                      <div style={{ fontSize:'0.55rem', color:T.muted, width:14, textAlign:'right', flexShrink:0 }}>{s}</div>
                      <div style={{ flex:1, height:5, background:T.surface, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:3, background:r>=0.8?T.wineLight:T.gold, width:`${Math.min(r*100,100)}%`, opacity:r>0?1:0 }} />
                      </div>
                      <div style={{ fontSize:'0.55rem', color:T.muted, width:18, flexShrink:0 }}>{b||''}</div>
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
}
