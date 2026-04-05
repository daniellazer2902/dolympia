'use client'

import { useState, useEffect } from 'react'
import { fetchAllDrawWords, createDrawWord, updateDrawWord, deleteDrawWord } from '@/lib/supabase/draw-words'
import type { DrawWord } from '@/lib/supabase/types'

export function DrawWordList() {
  const [words, setWords] = useState<DrawWord[]>([])
  const [loading, setLoading] = useState(true)
  const [newWord, setNewWord] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWord, setEditWord] = useState('')
  const [editCategory, setEditCategory] = useState('')

  async function load() {
    setLoading(true)
    const data = await fetchAllDrawWords()
    setWords(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!newWord.trim()) return
    await createDrawWord(newWord.trim(), newCategory.trim() || null)
    setNewWord('')
    setNewCategory('')
    load()
  }

  async function handleUpdate(id: string) {
    if (!editWord.trim()) return
    await updateDrawWord(id, editWord.trim(), editCategory.trim() || null)
    setEditingId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer ce mot ?')) return
    await deleteDrawWord(id)
    load()
  }

  if (loading) return <p className="text-fiesta-dark/60 animate-pulse">Chargement...</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Add form */}
      <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Mot</label>
          <input
            type="text"
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nouveau mot..."
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          />
        </div>
        <div className="min-w-[120px]">
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Catégorie</label>
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="Ex: animal..."
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newWord.trim()}
          className="bg-fiesta-orange text-white font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {words.map(w => (
          <div key={w.id} className="bg-white rounded-xl p-3 border-2 border-gray-100 flex items-center justify-between gap-3">
            {editingId === w.id ? (
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={editWord}
                  onChange={e => setEditWord(e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:border-fiesta-orange"
                />
                <input
                  type="text"
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  placeholder="catégorie"
                  className="border-2 border-gray-300 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:border-fiesta-orange"
                />
                <button onClick={() => handleUpdate(w.id)} className="text-xs text-emerald-500 font-bold">OK</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-fiesta-dark/50">Annuler</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold text-fiesta-dark">{w.word}</span>
                  {w.category && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-fiesta-dark/50">{w.category}</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingId(w.id); setEditWord(w.word); setEditCategory(w.category ?? '') }}
                    className="text-xs text-blue-500 hover:underline font-medium"
                  >Modifier</button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-xs text-red-500 hover:underline font-medium"
                  >Supprimer</button>
                </div>
              </>
            )}
          </div>
        ))}
        {words.length === 0 && <p className="text-sm text-fiesta-dark/50">Aucun mot</p>}
      </div>

      <p className="text-xs text-fiesta-dark/40">{words.length} mot{words.length > 1 ? 's' : ''} au total</p>
    </div>
  )
}
