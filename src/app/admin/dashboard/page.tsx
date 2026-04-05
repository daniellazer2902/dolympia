'use client'

import { useState } from 'react'
import { StatsOverview } from './components/StatsOverview'
import { QuestionList } from './components/QuestionList'
import { DrawWordList } from './components/DrawWordList'
import { WordPairList } from './components/WordPairList'
import { GameSettingsPanel } from './components/GameSettingsPanel'

type Tab = 'stats' | 'questions' | 'draw-words' | 'word-pairs' | 'game-settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'stats', label: 'Vue d\'ensemble' },
  { id: 'questions', label: 'Questions' },
  { id: 'draw-words', label: 'Mots Dessin' },
  { id: 'word-pairs', label: 'Paires Mots' },
  { id: 'game-settings', label: 'Jeux' },
]

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('stats')

  return (
    <div className="min-h-screen bg-fiesta-bg p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-playful text-fiesta-orange mb-6">dolympia admin</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
              tab === t.id
                ? 'border-fiesta-orange bg-fiesta-orange text-white'
                : 'border-gray-300 bg-white text-fiesta-dark hover:border-fiesta-orange/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsOverview />}
      {tab === 'questions' && <QuestionList />}
      {tab === 'draw-words' && <DrawWordList />}
      {tab === 'word-pairs' && <WordPairList />}
      {tab === 'game-settings' && <GameSettingsPanel />}

      <p className="text-fiesta-dark/40 text-xs mt-8">&copy; Daniel Gavriline &middot; v1.0.0</p>
    </div>
  )
}
