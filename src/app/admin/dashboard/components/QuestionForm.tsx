'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { GeoGuessUploader } from './GeoGuessUploader'
import type { Question } from '@/lib/supabase/types'

const GAME_TYPES = [
  { id: 'quiz', label: 'Quiz' },
  { id: 'true-false', label: 'Vrai ou Faux' },
  { id: 'order-logic', label: 'Ordre Logique' },
  { id: 'geo-guess', label: 'GeoGuess' },
]

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

interface QuestionFormProps {
  question?: Question | null
  onSave: () => void
  onCancel: () => void
}

export function QuestionForm({ question, onSave, onCancel }: QuestionFormProps) {
  const isEdit = !!question

  const [gameType, setGameType] = useState(question?.game_type ?? 'quiz')
  const [content, setContent] = useState(question?.content ?? '')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(question?.difficulty ?? 'easy')
  const [category, setCategory] = useState(question?.category ?? '')
  const [options, setOptions] = useState<string[]>(() => {
    if (question?.options && Array.isArray(question.options)) {
      return question.options.map(String)
    }
    return ['', '', '', '']
  })
  const [answer, setAnswer] = useState<string>(() => {
    if (question?.answer == null) return ''
    if (typeof question.answer === 'string') {
      try { return JSON.parse(question.answer) } catch { return question.answer }
    }
    if (typeof question.answer === 'boolean') return question.answer.toString()
    if (Array.isArray(question.answer)) return JSON.stringify(question.answer)
    return String(question.answer)
  })
  const [saving, setSaving] = useState(false)

  // Pour true-false, answer est "true" ou "false"
  const [tfAnswer, setTfAnswer] = useState<boolean>(() => {
    if (question?.game_type === 'true-false') {
      const a = question.answer
      if (typeof a === 'boolean') return a
      if (typeof a === 'string') return a === 'true'
    }
    return true
  })

  // Pour order-logic, les options SONT l'ordre correct
  const [orderItems, setOrderItems] = useState<string[]>(() => {
    if (question?.game_type === 'order-logic' && Array.isArray(question.answer)) {
      const ans = question.answer as unknown[]
      return ans.map(String)
    }
    return ['', '', '', '']
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = getSupabaseClient()

    let finalOptions: unknown[] = []
    let finalAnswer: unknown = ''

    if (gameType === 'quiz') {
      finalOptions = options.filter(Boolean)
      finalAnswer = answer
    } else if (gameType === 'true-false') {
      finalOptions = []
      finalAnswer = tfAnswer
    } else if (gameType === 'order-logic') {
      const items = orderItems.filter(Boolean)
      finalOptions = items
      finalAnswer = items // l'ordre correct = l'ordre dans lequel l'admin les saisit
    } else if (gameType === 'geo-guess') {
      finalOptions = options.filter(Boolean)
      finalAnswer = answer
    }

    const payload = {
      game_type: gameType,
      content,
      options: finalOptions,
      answer: finalAnswer,
      difficulty,
      category: category || null,
    }

    if (isEdit && question) {
      await supabase.from('questions').update(payload).eq('id', question.id)
    } else {
      await supabase.from('questions').insert(payload)
    }

    setSaving(false)
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border-2 border-fiesta-orange/20 flex flex-col gap-4">
      <h3 className="font-bold text-fiesta-dark">{isEdit ? 'Modifier' : 'Nouvelle question'}</h3>

      {/* Game type */}
      <div>
        <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Type de jeu</label>
        <select
          value={gameType}
          onChange={e => setGameType(e.target.value)}
          disabled={isEdit}
          className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
        >
          {GAME_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {/* Difficulty + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Difficulté</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as typeof difficulty)}
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          >
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Catégorie</label>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Ex: culture, science..."
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
          />
        </div>
      </div>

      {/* Content */}
      {gameType === 'geo-guess' ? (
        <GeoGuessUploader
          currentUrl={content.startsWith('http') ? content : undefined}
          onUpload={url => setContent(url)}
        />
      ) : (
        <div>
          <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">
            {gameType === 'true-false' ? 'Affirmation' : gameType === 'order-logic' ? 'Consigne' : 'Question'}
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={2}
            className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange resize-none"
            required
          />
        </div>
      )}

      {/* Type-specific fields */}
      {gameType === 'quiz' && (
        <>
          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Options (4 choix)</label>
            {options.map((opt, i) => (
              <input
                key={i}
                type="text"
                value={opt}
                onChange={e => { const next = [...options]; next[i] = e.target.value; setOptions(next) }}
                placeholder={`Option ${i + 1}`}
                className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full mb-2 focus:outline-none focus:border-fiesta-orange"
                required
              />
            ))}
          </div>
          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Bonne réponse</label>
            <select
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
            >
              <option value="">-- Choisir --</option>
              {options.filter(Boolean).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
          </div>
        </>
      )}

      {gameType === 'true-false' && (
        <div>
          <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Réponse</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTfAnswer(true)}
              className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${tfAnswer ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-fiesta-dark'}`}
            >Vrai</button>
            <button
              type="button"
              onClick={() => setTfAnswer(false)}
              className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${!tfAnswer ? 'border-red-500 bg-red-500 text-white' : 'border-gray-300 text-fiesta-dark'}`}
            >Faux</button>
          </div>
        </div>
      )}

      {gameType === 'order-logic' && (
        <div>
          <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Éléments (dans l&apos;ordre correct)</label>
          {orderItems.map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <span className="text-sm font-bold text-fiesta-dark/50 w-6 text-center pt-2">{i + 1}</span>
              <input
                type="text"
                value={item}
                onChange={e => { const next = [...orderItems]; next[i] = e.target.value; setOrderItems(next) }}
                placeholder={`Élément ${i + 1}`}
                className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:border-fiesta-orange"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOrderItems([...orderItems, ''])}
            className="text-sm text-fiesta-orange font-bold hover:underline"
          >+ Ajouter un élément</button>
        </div>
      )}

      {gameType === 'geo-guess' && (
        <>
          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Options (4 choix pays/ville)</label>
            {options.map((opt, i) => (
              <input
                key={i}
                type="text"
                value={opt}
                onChange={e => { const next = [...options]; next[i] = e.target.value; setOptions(next) }}
                placeholder={`Option ${i + 1}`}
                className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full mb-2 focus:outline-none focus:border-fiesta-orange"
                required
              />
            ))}
          </div>
          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-1">Bonne réponse</label>
            <select
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-fiesta-orange"
            >
              <option value="">-- Choisir --</option>
              {options.filter(Boolean).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-fiesta-orange text-white font-bold rounded-full px-6 py-2 shadow-btn-orange active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-fiesta-dark/60 hover:text-fiesta-rose font-medium transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
