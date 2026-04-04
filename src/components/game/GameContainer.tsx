'use client'

import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'
import { useTimer } from '@/hooks/useTimer'
import { getGame } from '@/games/registry'
import { HUD } from './HUD'
import type { RoundConfig } from '@/games/types'

interface GameContainerProps {
  onSubmit: (value: unknown) => void
  onRoundEnd: () => void
}

export function GameContainer({ onSubmit, onRoundEnd }: GameContainerProps) {
  const { currentRound, phase, totalScores, players } = useGameStore()
  const { localPlayer } = useSessionStore()

  const duration = (currentRound?.config?.duration as number) ?? 30
  const { timeLeft } = useTimer(duration, phase === 'playing', onRoundEnd)

  if (!currentRound || !localPlayer) return null

  const gameModule = getGame(currentRound.game_type)
  const myScore = totalScores[localPlayer.id] ?? 0
  const myPlayer = players.find(p => p.id === localPlayer.id)

  let teamScore: number | undefined
  if (myPlayer?.team) {
    teamScore = players
      .filter(p => p.team === myPlayer.team)
      .reduce((acc, p) => acc + (totalScores[p.id] ?? 0), 0)
  }

  return (
    <div className="flex flex-col h-full">
      <HUD
        round={currentRound}
        roundNumber={currentRound.round_number}
        totalRounds={10}
        timeLeft={timeLeft}
        myScore={myScore}
        myTeam={myPlayer?.team}
        teamScore={teamScore}
      />
      <div className="flex-1 p-4">
        {gameModule ? (
          <gameModule.Component
            config={currentRound.config as RoundConfig}
            playerId={localPlayer.id}
            timeLeft={timeLeft}
            onSubmit={onSubmit}
            isHost={localPlayer.is_host}
            disabled={phase !== 'playing'}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Jeu &quot;{currentRound.game_type}&quot; à venir dans le Plan 2...</p>
          </div>
        )}
      </div>
    </div>
  )
}
