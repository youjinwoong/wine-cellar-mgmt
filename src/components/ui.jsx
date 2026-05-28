import { useState, useEffect } from 'react'
import { T, compressImage } from '../config/cellars.js'

// ── Button ──────────────────────────────────────────────────────
export function Btn({ variant = 'ghost', size = 'md', children, style, ...p }) {
  const base = {
    border: 'none', borderRadius: 8, fontFamily: "'Outfit',sans-serif",
    fontWeight: 500, transition: 'all 0.2s',
    fontSize: size === 'sm' ? '0.775rem' : '0.875rem',
    padding: size === 'sm' ? '5px 11px' : '10px 20px',
  }
  const variants = {
    gold:   { background: T.gold,   color: T.bg,    fontWeight: 600 },
    wine:   { background: T.wine,   color: T.cream },
    ghost:  { background: 'transparent', color: T.muted, border: `1px solid ${T.border}` },
    danger: { background: 'transparent', color: '#c0392b', border: '1px solid #c0392b' },
    accent: { background: T.gold + '22', color: T.gold, border: `1px solid ${T.gold}44` },
  }
  return <button style={{ ...base, ...variants[variant], ...style }} {...p}>{children}</button>
}

// ── Label ───────────────────────────────────────────────────────
export const lbl = {
  display: 'block', fontSize: '0.72rem', color: T.muted,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 6, fontWeight: 500,
}

// ── useIsMobile ─────────────────────────────────────────────────
export function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 640)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

// ── StarRating ──────────────────────────────────────────────────
export function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const labels = ['', '나쁨', '그저그럼', '괜찮음', '좋음', '최고']
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n === value ? 0 : n)}
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          style={{ background: 'none', border: 'none', fontSize: '1.6rem', padding: 0, lineHeight: 1,
            transform: (hovered || value) >= n ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s' }}
        >
          <span style={{ color: (hovered || value) >= n ? T.gold : T.border }}>★</span>
        </button>
      ))}
      {value > 0 && <span style={{ fontSize: '0.8rem', color: T.muted, marginLeft: 4 }}>{labels[value]}</span>}
    </div>
  )
}

// ── Toast ───────────────────────────────────────────────────────
export function Toast({ message, type = 'info' }) {
  const colors = { info: T.muted, success: '#4a8a5e', warning: T.gold, error: '#c0392b' }
  return (
    <div style={{
      position: 'fixed', bottom: 74, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, background: T.card, border: `1px solid ${colors[type]}`,
      color: colors[type], borderRadius: 10, padding: '10px 18px',
      fontSize: '0.85rem', fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'fadeUp 0.25s ease', maxWidth: 320, textAlign: 'center',
      whiteSpace: 'pre-line', lineHeight: 1.5,
    }}>
      {message}
    </div>
  )
}

// ── ImagePicker ─────────────────────────────────────────────────
export function ImagePicker({ imageUrl, imgSrc, imgSearching, imgErr, onClear, onUpload, onRetry }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={lbl}>
        와인 라벨 이미지
        <span style={{ color: T.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
          (AI 검색 시 자동 / 또는 직접 촬영)
        </span>
      </label>

      <input id="img-upload-input" type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={async e => {
          const f = e.target.files?.[0]
          if (!f) return
          const dataUrl = await compressImage(f)
          onUpload(dataUrl)
          e.target.value = ''
        }}
      />

      {imageUrl ? (
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: T.surface, borderRadius: 10, padding: 12, border: `1px solid ${T.border}` }}>
          <img src={imageUrl} alt="와인 라벨"
            style={{ width: 58, height: 82, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: imgSrc === 'ai' ? T.gold : T.mutedMid, marginBottom: 8 }}>
              {imgSrc === 'ai' ? '🔍 AI가 찾은 이미지' : '📷 직접 업로드'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => document.getElementById('img-upload-input').click()}
                style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', borderRadius: 7, padding: '5px 11px', fontSize: '0.75rem' }}>
                📷 바꾸기
              </button>
              <button onClick={onClear}
                style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', borderRadius: 7, padding: '5px 11px', fontSize: '0.75rem' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: T.surface, borderRadius: 10, padding: 14, border: `2px dashed ${T.border}` }}>
          {imgSearching && <div style={{ textAlign: 'center', color: T.muted, fontSize: '0.82rem', marginBottom: 10 }}>🔍 이미지 검색 중...</div>}
          {imgErr && (
            <div style={{ fontSize: '0.78rem', color: '#c0392b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              ✕ 이미지를 찾지 못했습니다
              <button onClick={onRetry} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem' }}>다시 시도</button>
            </div>
          )}
          {!imgSearching && !imgErr && <div style={{ fontSize: '0.78rem', color: T.muted, marginBottom: 10 }}>AI 검색 버튼 클릭 시 자동으로 이미지를 찾아드립니다</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => document.getElementById('img-upload-input').click()}
              style={{ background: T.gold + '22', border: `1px solid ${T.gold}44`, color: T.gold, cursor: 'pointer', borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 500 }}>
              📷 사진 촬영 / 선택
            </button>
            <button onClick={onClear}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem' }}>
              빈 이미지
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
