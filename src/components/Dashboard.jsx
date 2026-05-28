import { CELLARS, getSlots, T, krw } from '../config/cellars.js'
import { useIsMobile } from './ui.jsx'

export default function Dashboard({ wines, drinkLog, bottlesIn, setTab, setCellarId }) {
  const mobile = useIsMobile()
  const total = wines.reduce((s, w) => s + (w.qty || 1), 0)
  const value = wines.reduce((s, w) => s + (w.price || 0) * (w.qty || 1), 0)
  const usedSlots = new Set(wines.map(w => `${w.cellarId}:${w.slot}`)).size
  const totalSlots = CELLARS.reduce((s, c) => s + c.slots, 0)

  return (
    <div className="fade-in">
      <h1 className="heading">셀러 현황</h1>
      <p className="subheading">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 28 }}>
        {[
          { label: '총 와인 기록', val: `${wines.length}건`, sub: '구매 기록 수' },
          { label: '총 보관 병 수', val: `${total}병`, sub: `${usedSlots}/${totalSlots} 칸 사용` },
          { label: '총 구매 금액', val: krw(value), sub: '구매가 합계' },
          { label: '음주 기록', val: `${drinkLog.length}번`, sub: '마신 와인 기록', onClick: () => setTab('log') },
        ].map(({ label, val, sub, onClick }) => (
          <div key={label} onClick={onClick} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18,
            cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.2s',
          }}
            onMouseEnter={onClick ? e => e.currentTarget.style.borderColor = T.gold : undefined}
            onMouseLeave={onClick ? e => e.currentTarget.style.borderColor = T.border : undefined}
          >
            <div style={{ fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 600, color: T.cream, marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: '0.72rem', color: T.muted }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Cellar cards */}
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: T.cream, marginBottom: 14 }}>셀러별 현황</h2>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {CELLARS.map(c => {
          const slots = getSlots(c)
          const totalB = wines.filter(w => w.cellarId === c.id).reduce((s, w) => s + (w.qty || 1), 0)
          const usedN = slots.filter(s => bottlesIn(c.id, s) > 0).length
          const pct = Math.round(totalB / (c.slots * c.maxPerSlot) * 100) || 0
          return (
            <div key={c.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => { setCellarId(c.id); setTab('cellar') }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.gold}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', fontWeight: 600, color: T.cream }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: T.muted, marginTop: 2 }}>{c.slots}칸 · 칸당 max {c.maxPerSlot}병</div>
                </div>
                <span style={{ background: T.gold + '22', color: T.gold, border: `1px solid ${T.gold}44`, borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ background: T.surface, borderRadius: 4, height: 5, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${T.wine}, ${T.gold})`, width: `${pct}%`, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: '0.78rem', color: T.muted }}>보관 중 <span style={{ color: T.cream, fontWeight: 500 }}>{totalB}병</span></div>
                <div style={{ fontSize: '0.78rem', color: T.muted }}>사용 칸 <span style={{ color: T.cream, fontWeight: 500 }}>{usedN}/{c.slots}</span></div>
              </div>
              {/* Mini rack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {slots.map(s => {
                  const b = bottlesIn(c.id, s)
                  const r = b / c.maxPerSlot
                  return (
                    <div key={s} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <div style={{ fontSize: '0.55rem', color: T.muted, width: 14, textAlign: 'right', flexShrink: 0 }}>{s}</div>
                      <div style={{ flex: 1, height: 5, background: T.surface, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: r >= 0.8 ? T.wineLight : r >= 0.4 ? T.gold : T.goldDim, width: `${Math.min(r * 100, 100)}%`, opacity: r > 0 ? 1 : 0 }} />
                      </div>
                      <div style={{ fontSize: '0.55rem', color: T.muted, width: 18, flexShrink: 0 }}>{b || ''}</div>
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
