import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://nmjawxbbwlerugfyypft.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamF3eGJid2xlcnVnZnl5cGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjgwNDQsImV4cCI6MjA5NTU0NDA0NH0.TIIjA4J2a2Fuf0HyEXeYobWHPpzYerItNoO7OtR-MaU'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── wines ────────────────────────────────────────────────────────
export async function loadWines() {
  const { data, error } = await supabase.from('wines').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data.map(dbToWine)
}

export async function loadDrinkLog() {
  const { data, error } = await supabase.from('drink_log').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(dbToDrink)
}

export async function loadPurchaseHistory(wineId) {
  const { data, error } = await supabase.from('purchase_history').select('*').eq('wine_id', wineId).order('purchase_date', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertWine(wine) {
  const { error } = await supabase.from('wines').upsert(wineToDb(wine))
  if (error) throw error
}

export async function deleteWine(id) {
  const { error } = await supabase.from('wines').delete().eq('id', id)
  if (error) throw error
}

export async function insertDrink(record) {
  const { error } = await supabase.from('drink_log').insert(drinkToDb(record))
  if (error) throw error
}

export async function deleteDrink(id) {
  const { error } = await supabase.from('drink_log').delete().eq('id', id)
  if (error) throw error
}

export async function addPurchaseHistory(record) {
  const { error } = await supabase.from('purchase_history').insert(record)
  if (error) throw error
}

export async function loadWineByShareToken(token) {
  const { data, error } = await supabase.from('wines').select('*').eq('share_token', token).single()
  if (error) return null
  return dbToWine(data)
}

// ── camelCase ↔ snake_case ───────────────────────────────────────
function wineToDb(w) {
  return {
    id: w.id, name: w.name, vintage: w.vintage || null,
    qty: w.qty || 1, price: w.price || 0,
    purchase_date: w.purchaseDate || null,
    cellar_id: w.cellarId, slot: w.slot,
    image_url: w.imageUrl || '', notes: w.notes || '',
    producer: w.producer || '', region: w.region || '',
    country: w.country || '', grape: w.grape || '',
    description: w.description || '',
    vivino_price: w.vivinoPrice || null,
    vivino_rating: w.vivinoRating || null,
    wine_searcher_price: w.wineSearcherPrice || null,
    drinking_from: w.drinkingFrom || null,
    drinking_to: w.drinkingTo || null,
    wine_type: w.wineType || 'red',
    share_token: w.shareToken || null,
  }
}

function dbToWine(r) {
  return {
    id: r.id, name: r.name, vintage: r.vintage, qty: r.qty, price: r.price,
    purchaseDate: r.purchase_date, cellarId: r.cellar_id, slot: r.slot,
    imageUrl: r.image_url, notes: r.notes, producer: r.producer,
    region: r.region, country: r.country, grape: r.grape,
    description: r.description, vivinoPrice: r.vivino_price,
    vivinoRating: r.vivino_rating, wineSearcherPrice: r.wine_searcher_price,
    drinkingFrom: r.drinking_from, drinkingTo: r.drinking_to,
    wineType: r.wine_type, shareToken: r.share_token,
  }
}

function drinkToDb(r) {
  return {
    id: r.id, wine_id: r.wineId || null, wine_name: r.wineName,
    wine_vintage: r.wineVintage || null, cellar_name: r.cellarName || '',
    slot: r.slot || '', date: r.date, companions: r.companions || '',
    occasion: r.occasion || '', rating: r.rating || 0,
    review: r.review || '', image_url: r.imageUrl || '',
  }
}

function dbToDrink(r) {
  return {
    id: r.id, wineId: r.wine_id, wineName: r.wine_name,
    wineVintage: r.wine_vintage, cellarName: r.cellar_name,
    slot: r.slot, date: r.date, companions: r.companions,
    occasion: r.occasion, rating: r.rating, review: r.review,
    imageUrl: r.image_url, createdAt: r.created_at,
  }
}
