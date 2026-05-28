import { useState } from 'react'
import { CELLARS, getSlots, cellarById, T, krw } from '../config/cellars.js'
import { Btn, useIsMobile } from './ui.jsx'

export default function CellarView({ wines, winesIn, bottlesIn, cellarId, setCellarId, openAdd, openDetail, onDrink }) {
  const [expanded, setExpanded] = useState(null)
  const mobile = useIsMobile()
  const c = cellarById(cellarId)
  const slots = getSlots(c)

  return (
    <div className="fade-in">
      <h1 className="heading">셀러 뷰</h1>

      {/* Cellar tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {CELLARS.map(cc => (
          <button key={cc.id} onClick={() => { setCellarId(cc.id); setExpanded(null) }} style={{
            background: cc.id === cellarId ? T.gold : 'transparent',
            color: cc.id === cellarId ? T.bg : T.muted,
            border: cc.id === cellarId ? 'none' : `1px solid ${T.border}`,
            padding: '8px 20px', borderRadius: 8, fontSize: '0.875rem',
            fontWeight: cc.id === cellarId ? 600 : 400, transition: 'all 0.2s',
          }}>{cc.name}</button>
        ))}
      </div>

      {/* Info bar */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 18px', marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: T.cream, fontWeight: 600 }}>{c.name}</span>
          <span style={{ fontSize: '0.75rem', color: T.muted, marginLeft: 12 }}>{c.slots}칸 · 칸당 최대 {c.maxPerSlot}병 · 총 {c.slots * c.maxPerSlot}병</span>
        </div>
        {(() => {
          const totalB = wines.filter(w => w.cellarId === cellarId).reduce((s, w) => s + (w.qty || 1), 0)
          const pct = Math.round(totalB / (c.slots * c.maxPerSlot) * 100) || 0
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 120 }}>
              <div style={{ flex: 1, height: 6, background: T.surface, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg,${T.wine},${T.gold})`, width: `${pct}%`, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: T.gold, fontWeight: 600, flexShrink: 0 }}>{totalB}/{c.slots * c.maxPerSlot}병 ({pct}%)</span>
            </div>
          )
        })()}
      </div>

      {/* Rack rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slots.map(slot => {
          const b = bottlesIn(cellarId, slot)
          const ratio = b / c.maxPerSlot
          const isOpen = expanded === slot
          const slotWines = winesIn(cellarId, slot)

          return (
            <div key={slot} style={{ background: T.card, border: `1px solid ${isOpen ? T.gold + '88' : T.border}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              {/* Slot header */}
              <div onClick={() => setExpanded(isOpen ? null : slot)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', background: isOpen ? T.cardHover : 'transparent', transition: 'background 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: b > 0 ? T.gold + '22' : T.surface, border: `1px solid ${b > 0 ? T.gold + '66' : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '1rem', fontWeight: 600, color: b > 0 ? T.gold : T.muted }}>
                  {slot}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ fontSize: '0.78rem', color: b > 0 ? T.cream : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                      {b > 0 ? slotWines.map(w => w.name).join(' · ').substring(0, 50) + (slotWines.map(w => w.name).join('·').length > 50 ? '...' : '') : '비어있음'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ratio >= 0.85 ? T.wineLight : ratio > 0 ? T.gold : T.muted }}>{b}/{c.maxPerSlot}병</span>
                      <span style={{ color: T.muted, fontSize: '0.85rem' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: T.surface, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: ratio >= 0.85 ? `linear-gradient(90deg,${T.wine},${T.wineLight})` : `linear-gradient(90deg,${T.goldDim},${T.gold})`, width: `${Math.min(ratio * 100, 100)}%` }} />
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); openAdd({ cellarId, slot }) }}
                  style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', borderRadius: 7, padding: '5px 10px', fontSize: '0.78rem', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted }}
                >+ 추가</button>
              </div>

              {/* Wine list */}
              {isOpen && (
                <div className="slide-down" style={{ borderTop: `1px solid ${T.border}`, padding: '8px 0' }}>
                  {slotWines.length === 0 ? (
                    <div style={{ padding: '16px 18px', color: T.muted, fontSize: '0.85rem', textAlign: 'center' }}>빈 칸 — 위의 + 추가 버튼으로 와인을 등록하세요</div>
                  ) : slotWines.map(w => (
                    <div key={w.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 18px', transition: 'background 0.12s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.cardHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => openDetail(w.id)}
                    >
                      {w.imageUrl
                        ? <img src={w.imageUrl} alt="" style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                        : <div style={{ width: 32, height: 46, background: T.surface, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: `1px solid ${T.border}` }}>🍷</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                        <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 2 }}>
                          {w.vintage && <span style={{ color: T.gold, marginRight: 8 }}>{w.vintage}</span>}
                          <span style={{ marginRight: 8 }}>{w.qty || 1}병</span>
                          <span>{krw(w.price)}</span>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); onDrink(w) }}
                        style={{ background: T.wine + '33', border: `1px solid ${T.wine}`, color: T.wineLight, cursor: 'pointer', borderRadius: 6, padding: '5px 10px', fontSize: '0.75rem', flexShrink: 0 }}>
                        마심
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
