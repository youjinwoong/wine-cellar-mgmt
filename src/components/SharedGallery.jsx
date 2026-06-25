import { useState, useEffect } from 'react'
import { CELLARS, cellarById, T, krw, getDrinkingStatus, bottleBadge } from '../config/cellars.js'
import { useIsMobile } from './ui.jsx'
import { loadPublicWines } from '../lib/supabase.js'

// ── 공개 갤러리 (읽기 전용) ──────────────────────────────────────
// URL ?gallery=1 진입. 추가/수정/삭제/AI 없음. 시장가·셀러·칸만 표시, 구매가 숨김.
// ?gallery=1&price=0 진입 시 hidePrice=true → 시장가까지 숨긴 버전 (구매가는 원래 안 보임).
export default function SharedGallery({ hidePrice = false }) {
  const mobile = useIsMobile()
  const [wines, setWines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sort, setSort] = useState('name')
  const [filterCellar, setFilterCellar] = useState('')

  useEffect(() => {
    loadPublicWines()
      .then(w => { setWines(w); setLoading(false) })
      .catch(e => { console.error('Gallery load error:', e); setError(true); setLoading(false) })
  }, [])

  const sorted = [...wines]
    .filter(w => !filterCellar || w.cellarId === filterCellar)
    .sort((a, b) => {
      if (sort === 'name')    return (a.name || '').localeCompare(b.name || '', 'ko')
      if (sort === 'vintage') return (b.vintage || 0) - (a.vintage || 0)
      if (sort === 'market')  return (b.wineSearcherPrice || 0) - (a.wineSearcherPrice || 0)
      return 0
    })

  const totalBottles = wines.reduce((s, w) => s + (w.qty || 1), 0)
  // 시장가 컬럼 유무에 따라 그리드 컬럼 구성을 바꾼다 (헤더/행과 반드시 동일하게 유지)
  const COLS = hidePrice
    ? '48px 1.8fr 80px 64px 150px'
    : '48px 1.6fr 72px 56px 140px 130px'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, color: T.gold, fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', letterSpacing: '0.1em' }}>
      🍷 셀러를 불러오는 중...
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, color: T.muted, gap: 12 }}>
      <div style={{ fontSize: '2.5rem' }}>🍷</div>
      <div>갤러리를 불러오지 못했습니다.</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      {/* 헤더 */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '20px 28px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', color: T.gold, letterSpacing: '0.15em' }}>CAVE</div>
        <div style={{ color: T.muted, fontSize: '0.8rem', marginTop: 4 }}>
          와인 컬렉션 · {wines.length}종 {totalBottles}병
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 28px', paddingBottom: 80 }}>
        {/* 정렬·필터 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={filterCellar} onChange={e => setFilterCellar(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
            <option value="">전체 셀러</option>
            {CELLARS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '7px 10px' }}>
            <option value="name">이름순</option>
            <option value="vintage">빈티지순</option>
            {!hidePrice && <option value="market">시장가순</option>}
          </select>
        </div>

        {sorted.length === 0
          ? <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}><div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍷</div><div>표시할 와인이 없습니다.</div></div>
          : mobile
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sorted.map(w => {
                  const c = cellarById(w.cellarId)
                  const ds = getDrinkingStatus(w)
                  return (
                    <div key={w.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                      {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 40, height: 56, background: T.surface, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: `1px solid ${T.border}` }}>🍷</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                        <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {w.vintage && <span style={{ color: T.gold }}>{w.vintage}</span>}{bottleBadge(w.bottleSize) && <span style={{ color: T.wineLight, fontWeight: 600 }}>{bottleBadge(w.bottleSize)}</span>}
                          <span>{w.qty || 1}병</span>
                          {!hidePrice && w.wineSearcherPrice > 0 && <span style={{ color: T.gold }}>시장가 {krw(w.wineSearcherPrice)}</span>}
                          {ds && <span style={{ color: ds.color }}>{ds.icon} {ds.label}</span>}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: 2 }}>{c?.name} 셀러 {w.slot}번 칸</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            : <>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '8px 14px', fontSize: '0.68rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${T.border}` }}>
                  <span></span>
                  <span>이름</span>
                  <span style={{ textAlign: 'center' }}>빈티지</span>
                  <span style={{ textAlign: 'right' }}>수량</span>
                  {!hidePrice && <span style={{ textAlign: 'right', color: T.gold }}>시장가(₩)</span>}
                  <span>셀러 · 위치</span>
                </div>
                {sorted.map(w => {
                  const c = cellarById(w.cellarId)
                  return (
                    <div key={w.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 8, marginBottom: 2 }}>
                      {w.imageUrl ? <img src={w.imageUrl} alt="" style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: 36, height: 50, background: T.surface, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🍷</div>}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                          {bottleBadge(w.bottleSize) && <span style={{ fontSize: '0.7rem', color: T.wineLight, fontWeight: 600, flexShrink: 0 }}>{bottleBadge(w.bottleSize)}</span>}
                        </div>
                        {w.producer && <div style={{ fontSize: '0.7rem', color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.producer}</div>}
                      </div>
                      <span style={{ fontSize: '0.875rem', color: T.gold, fontWeight: 500, textAlign: 'center' }}>{w.vintage || '??'}</span>
                      <span style={{ fontSize: '0.875rem', color: T.text, textAlign: 'right' }}>{w.qty || 1}병</span>
                      {!hidePrice && <span style={{ fontSize: '0.875rem', color: w.wineSearcherPrice ? T.gold : T.muted, fontWeight: w.wineSearcherPrice ? 600 : 400, textAlign: 'right' }}>{w.wineSearcherPrice ? krw(w.wineSearcherPrice) : '-'}</span>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.surface, borderRadius: 8, padding: '5px 10px', border: `1px solid ${T.border}` }}>
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
    </div>
  )
}
