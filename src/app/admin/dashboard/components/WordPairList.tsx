'use client'

import { useState, useEffect } from 'react'
import { fetchAllWordPairs, createWordPair, updateWordPair, deleteWordPair } from '@/lib/supabase/word-pairs'
import type { WordPair } from '@/lib/supabase/types'

export function WordPairList() {
  const [pairs, setPairs] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(true)
  const [newA, setNewA] = useState('')
  const [newB, setNewB] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editA, setEditA] = useState('')
  const [editB, setEditB] = useState('')
  const [editCategory, setEditCategory] = useState('')

  async function load() {
    setLoading(true)
    const data = await fetchAllWordPairs()
    setPairs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!newA.trim() || !newB.trim()) return
    await createWordPair(newA.trim(), newB.trim(), newCategory.trim() || null)
    setNewA('')
    setNewB('')
    setNewCategory('')
    load()
  }

  async function handleUpdate(id: string) {
    if (!editA.trim() || !editB.trim()) return
    await updateWordPair(id, editA.trim(), editB.trim(), editCategory.trim() || null)
    setEditingId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer cette paire ?')) return
    await deleteWordPair(id)
    load()
  }

  if (loading) return <p className="text-fiesta-dark/60 animate-pulse">Chargement...</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Add form */}
      <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Mot A</label>
          <input
            type="text"
            value={newA}
            onChange={e => setNewA(e.target.value)}
            placeholder="Soleil..."
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Mot B</label>
          <input
            type="text"
            value={newB}
            onChange={e => setNewB(e.target.value)}
            placeholder="Plage..."
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          />
        </div>
        <div className="min-w-[100px]">
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Catégorie</label>
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="vacances..."
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newA.trim() || !newB.trim()}
          className="bg-fiesta-orange text-white font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {pairs.map(p => (
          <div key={p.id} className="bg-white rounded-xl p-3 border-2 border-gray-100 flex items-center justify-between gap-3">
            {editingId === p.id ? (
              <div className="flex gap-2 flex-1 flex-wrap">
                <input
                  type="text"
                  value={editA}
                  onChange={e => setEditA(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-2 py-1 text-sm flex-1 min-w-[80px] focus:outline-none focus:border-fiesta-orange"
                />
                <input
                  type="text"
                  value={editB}
                  onChange={e => setEditB(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-2 py-1 text-sm flex-1 min-w-[80px] focus:outline-none focus:border-fiesta-orange"
                />
                <input
                  type="text"
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  placeholder="catégorie"
                  className="border-2 border-gray-300 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:border-fiesta-orange"
                />
                <button onClick={() => handleUpdate(p.id)} className="text-xs text-emerald-500 font-bold">OK</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-fiesta-dark/50">Annuler</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-bold text-fiesta-orange">{p.word_a}</span>
                  <span className="text-fiesta-dark/40">+</span>
                  <span className="font-bold text-fiesta-rose">{p.word_b}</span>
                  {p.category && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-fiesta-dark/50 ml-2">{p.category}</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingId(p.id); setEditA(p.word_a); setEditB(p.word_b); setEditCategory(p.category ?? '') }}
                    className="text-xs text-blue-500 hover:underline font-medium"
                  >Modifier</button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-red-500 hover:underline font-medium"
                  >Supprimer</button>
                </div>
              </>
            )}
          </div>
        ))}
        {pairs.length === 0 && <p className="text-sm text-fiesta-dark/50">Aucune paire</p>}
      </div>

      <p className="text-xs text-fiesta-dark/40">{pairs.length} paire{pairs.length > 1 ? 's' : ''} au total</p>
    </div>
  )
}
