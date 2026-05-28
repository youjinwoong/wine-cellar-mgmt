import { useState, useEffect, useCallback, useRef } from 'react'
import { T, uid } from './config/cellars.js'
import {
  loadWines, loadDrinkLog,
  upsertWine, deleteWine, insertDrink, deleteDrink
} from './lib/supabase.js'

import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'
import CellarView from './components/CellarView.jsx'
import { SearchView, ListView, DrinkLogView } from './components/Views.jsx'
import AddWineModal from './components/modals/AddWineModal.jsx'
import { DetailModal, DrinkModal, SettingsModal, BulkImportModal } from './components/modals/Modals.jsx'
import { Toast } from './components/ui.jsx'
import './index.css'

export default function App() {
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

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
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
  }, [])

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
        {tab === 'dash'   && <Dashboard {...shared} setTab={setTab} />}
        {tab === 'cellar' && <CellarView {...shared} onDrink={openDrink} />}
        {tab === 'log'    && <DrinkLogView drinkLog={drinkLog} onDelete={removeDrink} />}
        {tab === 'search' && <SearchView wines={wines} openDetail={openDetail} openDrink={openDrink} goSlot={goSlot} />}
        {tab === 'list'   && <ListView wines={wines} openDetail={openDetail} openDrink={openDrink} goSlot={goSlot} />}
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
          goSlot={goSlot}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
