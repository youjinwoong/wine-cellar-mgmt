import { useState, useEffect, useCallback, useRef } from 'react'
import { T, uid } from './config/cellars.js'
import {
  loadWines, loadDrinkLog,
  upsertWine, deleteWine, insertDrink, deleteDrink,
  signIn, getSession, onAuthChange
} from './lib/supabase.js'

import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'
import CellarView from './components/CellarView.jsx'
import { SearchView, ListView, DrinkLogView, StatisticsView } from './components/Views.jsx'
import AddWineModal from './components/modals/AddWineModal.jsx'
import { DetailModal, DrinkModal, SettingsModal, BulkImportModal } from './components/modals/Modals.jsx'
import { Toast } from './components/ui.jsx'
import SharedGallery from './components/SharedGallery.jsx'
import './index.css'

// ── 로그인 화면 ──────────────────────────────────────────────────
function LoginScreen({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!email.trim() || !password) return
    setBusy(true); setErr('')
    try {
      await signIn(email.trim(), password)
      onSignedIn()
    } catch (e) {
      setErr('로그인 실패 — 이메일/비밀번호를 확인하세요')
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.bg, padding: 24 }}>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.4rem', color: T.gold, letterSpacing: '0.15em', marginBottom: 4 }}>CAVE</div>
      <div style={{ color: T.muted, fontSize: '0.85rem', marginBottom: 32 }}>와인 셀러 관리</div>
      <div style={{ width: '100%', maxWidth: 340, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
        <label style={{ display: 'block', color: T.mutedMid, fontSize: '0.75rem', marginBottom: 6 }}>이메일</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="username"
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ width: '100%', marginBottom: 14, padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.cream, fontSize: '0.9rem' }} />
        <label style={{ display: 'block', color: T.mutedMid, fontSize: '0.75rem', marginBottom: 6 }}>비밀번호</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password"
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ width: '100%', marginBottom: 18, padding: '10px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.cream, fontSize: '0.9rem' }} />
        {err && <div style={{ color: T.wineLight, fontSize: '0.78rem', marginBottom: 14 }}>{err}</div>}
        <button onClick={submit} disabled={busy || !email.trim() || !password}
          style={{ width: '100%', padding: '11px', background: busy ? T.muted : T.gold, color: T.bg, border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  // 공개 갤러리 모드 — 로그인 없이 읽기 전용 진입
  //   ?gallery=1            → 시장가 포함 갤러리
  //   ?gallery=1&price=0    → 시장가까지 숨긴 갤러리 (구매가는 어느 쪽이든 항상 숨김)
  const _params = new URLSearchParams(window.location.search)
  const isGallery = _params.get('gallery') === '1'
  if (isGallery) return <SharedGallery hidePrice={_params.get('price') === '0'} />

  const [session, setSession]   = useState(undefined) // undefined=확인중, null=로그아웃, obj=로그인
  const [wines, setWines]       = useState([])
  const [drinkLog, setDrinkLog] = useState([])
  const [loading, setLoading]   = useState(true)
  const [syncStatus, setSyncStatus] = useState('loading')

  const [tab, setTab]         = useState('dash')
  const [cellarId, setCellarId] = useState('vindis1')

  const [modal, setModal]     = useState(null) // {type, ...data}
  const [toast, setToast]     = useState(null)

  const showToast = useCallback((msg, type = 'info', duration = 3000) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), duration)
  }, [])

  // ── 시장가 일괄 업데이트 이벤트 리스너 ─────────────────────
  useEffect(() => {
    const handler = async (e) => {
      const { id, wineSearcherPrice, vivinoPrice, vivinoRating } = e.detail
      const wine = wines.find(w => w.id === id)
      if (!wine) return
      const updates = {}
      if (wineSearcherPrice) updates.wineSearcherPrice = wineSearcherPrice
      if (vivinoPrice) updates.vivinoPrice = vivinoPrice
      if (vivinoRating) updates.vivinoRating = vivinoRating
      if (Object.keys(updates).length > 0) await updateWine(id, updates)
    }
    window.addEventListener('cave:priceUpdate', handler)
    return () => window.removeEventListener('cave:priceUpdate', handler)
  }, [wines])

  // ── 세션 확인 + 로그인 상태 구독 ───────────────────────────────
  useEffect(() => {
    getSession().then(s => setSession(s ?? null))
    const unsub = onAuthChange(s => setSession(s ?? null))
    return unsub
  }, [])

  // ── Load data (로그인 후에만) ─────────────────────────────────
  useEffect(() => {
    if (!session) return
    async function init() {
      setLoading(true)
      try {
        const [w, l] = await Promise.all([loadWines(), loadDrinkLog()])
        setWines(w); setDrinkLog(l)
        setSyncStatus('synced')
      } catch (e) {
        console.error('Load error:', e)
        setSyncStatus('local')
        showToast('⚠ 데이터 로드 실패 — 네트워크 확인', 'error', 4000)
      }
      setLoading(false)
    }
    init()
  }, [session])

  // ── Helpers ──────────────────────────────────────────────────
  const winesIn  = (cid, slot) => wines.filter(w => w.cellarId === cid && w.slot === slot)
  const bottlesIn = (cid, slot) => winesIn(cid, slot).reduce((s, w) => s + (w.qty || 1), 0)

  // ── Wine CRUD ────────────────────────────────────────────────
  async function addWine(wine) {
    const w = { ...wine, id: wine.id || uid() }
    setWines(p => [...p, w])
    try { await upsertWine(w); setSyncStatus('synced') }
    catch { showToast('⚠ 저장 실패', 'error') }
  }

  async function updateWine(id, updates) {
    const updated = { ...wines.find(w => w.id === id), ...updates }
    setWines(p => p.map(w => w.id === id ? updated : w))
    try { await upsertWine(updated); setSyncStatus('synced') }
    catch { showToast('⚠ 수정 실패', 'error') }
  }

  async function removeWine(id) {
    setWines(p => p.filter(w => w.id !== id))
    try { await deleteWine(id); setSyncStatus('synced') }
    catch { showToast('⚠ 삭제 실패', 'error') }
  }

  // 위치 이동 — moveQty가 전체보다 적으면 분할(원본 차감 + 새 위치에 새 레코드)
  async function moveWine(wine, toCellarId, toSlot, moveQty) {
    const total = wine.qty || 1
    const qty = Math.max(1, Math.min(parseInt(moveQty) || total, total))
    if (qty >= total) {
      // 전체 이동 — 위치만 변경
      await updateWine(wine.id, { cellarId: toCellarId, slot: toSlot })
    } else {
      // 분할 이동 — 원본 병 수 차감 후 새 위치에 별도 레코드 생성
      await updateWine(wine.id, { qty: total - qty })
      await addWine({ ...wine, id: uid(), qty, cellarId: toCellarId, slot: toSlot, shareToken: null })
    }
    showToast(`🚚 ${qty}병 이동 완료`, 'success')
  }

  async function drinkWine(wine, record) {
    // Decrement qty
    const newQty = (wine.qty || 1) - 1
    if (newQty <= 0) {
      setWines(p => p.filter(w => w.id !== wine.id))
      try { await deleteWine(wine.id) } catch {}
    } else {
      const updated = { ...wine, qty: newQty }
      setWines(p => p.map(w => w.id === wine.id ? updated : w))
      try { await upsertWine(updated) } catch {}
    }
    // Add drink record
    const r = { ...record, id: record.id || uid() }
    setDrinkLog(p => [r, ...p])
    try { await insertDrink(r); showToast('🍷 음주 기록 저장됨', 'success') }
    catch { showToast('⚠ 기록 저장 실패', 'error') }
  }

  async function removeManyWines(ids) {
    setWines(p => p.filter(w => !ids.includes(w.id)))
    for (const id of ids) {
      try { await deleteWine(id) } catch {}
    }
    showToast(`🗑 ${ids.length}개 삭제 완료`, 'success')
  }

  async function removeDrink(id) {
    setDrinkLog(p => p.filter(r => r.id !== id))
    try { await deleteDrink(id) } catch {}
  }

  // Bulk add
  async function addManyWines(list) {
    for (const wine of list) {
      const w = { ...wine, id: wine.id || uid() }
      setWines(p => [...p, w])
      try { await upsertWine(w) } catch {}
    }
    setModal(null)
    showToast(`✓ ${list.length}종 추가 완료`, 'success')
  }

  // ── Modal helpers ────────────────────────────────────────────
  const openAdd    = (pre = {}) => setModal({ type: 'add', pre })
  const openDetail = (id)       => setModal({ type: 'detail', id })
  const openDrink  = (wine)     => setModal({ type: 'drink', wine })
  const goSlot     = (cid, slot) => { setCellarId(cid); setTab('cellar') }

  const detailWine = modal?.type === 'detail' ? wines.find(w => w.id === modal.id) : null

  // 세션 확인 중
  if (session === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, color: T.gold, fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', letterSpacing: '0.1em' }}>
      🍷
    </div>
  )

  // 로그아웃 상태 → 로그인 화면
  if (session === null) return <LoginScreen onSignedIn={() => {}} />

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, color: T.gold, fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', letterSpacing: '0.1em' }}>
      🍷 셀러를 열고 있습니다...
    </div>
  )

  const shared = { wines, drinkLog, winesIn, bottlesIn, cellarId, setCellarId, openAdd, openDetail, openDrink, goSlot }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg }}>
      <Header
        tab={tab} setTab={setTab}
        onAdd={() => openAdd()}
        onBulk={() => setModal({ type: 'bulk' })}
        onSettings={() => setModal({ type: 'settings' })}
        syncStatus={syncStatus}
      />

      <main style={{ flex: 1, padding: '24px 28px', maxWidth: 1060, margin: '0 auto', width: '100%', paddingBottom: 100 }}>
        {tab === 'dash'   && <Dashboard {...shared} setTab={setTab} openDetail={openDetail} />}
        {tab === 'cellar' && <CellarView {...shared} onDrink={openDrink} />}
        {tab === 'log'    && <DrinkLogView drinkLog={drinkLog} onDelete={removeDrink} />}
        {tab === 'search' && <SearchView wines={wines} openDetail={openDetail} openDrink={openDrink} goSlot={goSlot} />}
        {tab === 'list'   && <ListView wines={wines} openDetail={openDetail} openDrink={openDrink} goSlot={goSlot} onDeleteMany={removeManyWines} />}
        {tab === 'stats'  && <StatisticsView wines={wines} drinkLog={drinkLog} />}
      </main>

      {/* Modals */}
      {modal?.type === 'add' && (
        <AddWineModal pre={modal.pre || {}} onAdd={async w => { await addWine(w); setModal(null) }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'bulk' && (
        <BulkImportModal onAddMany={addManyWines} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'settings' && (
        <SettingsModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'drink' && (
        <DrinkModal wine={modal.wine} onConfirm={record => drinkWine(modal.wine, record)} onClose={() => setModal(null)} />
      )}
      {detailWine && (
        <DetailModal
          wine={detailWine}
          onClose={() => setModal(null)}
          onDrink={w => { setModal({ type: 'drink', wine: w }) }}
          onRemove={async () => { await removeWine(detailWine.id); setModal(null) }}
          onUpdate={async updates => { await updateWine(detailWine.id, updates) }}
          onMove={moveWine}
          goSlot={goSlot}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
