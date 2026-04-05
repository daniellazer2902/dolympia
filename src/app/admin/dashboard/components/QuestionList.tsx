'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { QuestionForm } from './QuestionForm'
import type { Question } from '@/lib/supabase/types'

const PAGE_SIZE = 20

export function QuestionList() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filterType, setFilterType] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadQuestions() {
    setLoading(true)
    const supabase = getSupabaseClient()
    let query = supabase.from('questions').select().order('created_at', { ascending: false })
    if (filterType) query = query.eq('game_type', filterType)
    if (filterDifficulty) query = query.eq('difficulty', filterDifficulty)
    const { data } = await query
    setQuestions((data ?? []) as Question[])
    setLoading(false)
  }

  useEffect(() => { loadQuestions() }, [filterType, filterDifficulty])

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer cette question ?')) return
    const supabase = getSupabaseClient()
    await supabase.from('questions').delete().eq('id', id)
    loadQuestions()
  }

  function handleSave() {
    setShowForm(false)
    setEditingQuestion(null)
    loadQuestions()
  }

  const filtered = search
    ? questions.filter(q => q.content.toLowerCase().includes(search.toLowerCase()))
    : questions

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Type</label>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(0) }}
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-fiesta-orange"
          >
            <option value="">Tous</option>
            <option value="quiz">Quiz</option>
            <option value="true-false">Vrai ou Faux</option>
            <option value="order-logic">Ordre Logique</option>
            <option value="geo-guess">GeoGuess</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Difficulté</label>
          <select
            value={filterDifficulty}
            onChange={e => { setFilterDifficulty(e.target.value); setPage(0) }}
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-fiesta-orange"
          >
            <option value="">Toutes</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-fiesta-dark/60 block mb-1">Recherche</label>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Rechercher..."
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          />
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingQuestion(null) }}
          className="bg-fiesta-orange text-white font-bold rounded-xl px-4 py-2 text-sm hover:bg-fiesta-orange/90 transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Form */}
      {(showForm || editingQuestion) && (
        <QuestionForm
          question={editingQuestion}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingQuestion(null) }}
        />
      )}

      {/* List */}
      {loading ? (
        <p className="text-fiesta-dark/60 animate-pulse">Chargement...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {paged.map(q => (
            <div key={q.id} className="bg-white rounded-xl p-3 border-2 border-gray-100 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-fiesta-orange/10 text-fiesta-orange">{q.game_type}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-fiesta-dark/60">{q.difficulty}</span>
                  {q.category && <span className="text-xs text-fiesta-dark/50">{q.category}</span>}
                </div>
                <p className="text-sm text-fiesta-dark truncate">{q.content}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setEditingQuestion(q); setShowForm(false) }}
                  className="text-xs text-blue-500 hover:underline font-medium"
                >Modifier</button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="text-xs text-red-500 hover:underline font-medium"
                >Supprimer</button>
              </div>
            </div>
          ))}
          {paged.length === 0 && <p className="text-sm text-fiesta-dark/50">Aucune question trouvée</p>}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm font-bold text-fiesta-orange disabled:text-gray-300"
          >← Préc</button>
          <span className="text-sm text-fiesta-dark/60">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-sm font-bold text-fiesta-orange disabled:text-gray-300"
          >Suiv →</button>
        </div>
      )}
    </div>
  )
}
