import { test, expect, type Page, type Browser } from '@playwright/test'

// ============================================================
// HELPERS
// ============================================================

async function createSession(page: Page, pseudo: string): Promise<string> {
  await page.goto(process.env.TEST_URL ?? 'http://localhost:3000')
  await page.getByPlaceholder('Ton pseudo').fill(pseudo)
  await page.getByRole('button', { name: 'Créer une partie' }).click()
  await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/, { timeout: 30000 })
  return page.url().split('/lobby/')[1]
}

async function joinSession(page: Page, pseudo: string, code: string) {
  await page.goto(process.env.TEST_URL ?? 'http://localhost:3000')
  await page.getByPlaceholder('Ton pseudo').fill(pseudo)
  await page.getByText('Rejoindre').click()
  await page.getByPlaceholder(/code/i).fill(code)
  await page.getByText('Rejoindre !').click()
  await page.waitForURL(new RegExp(`/lobby/${code}`), { timeout: 20000 })
}

/**
 * Disable all games except the specified one in the lobby GameSelector.
 * The host must be on the lobby page with "Mini-jeux actifs" visible.
 */
async function enableOnlyGame(hostPage: Page, gameName: string) {
  await expect(hostPage.getByText('Mini-jeux actifs')).toBeVisible({ timeout: 10000 })

  // Get all game buttons in the selector grid
  const gameButtons = hostPage.locator('.grid.grid-cols-2 button')
  const count = await gameButtons.count()

  for (let i = 0; i < count; i++) {
    const btn = gameButtons.nth(i)
    const text = await btn.textContent()
    const isTarget = text?.includes(gameName)

    // Check if it's currently enabled (has orange border) or disabled (has line-through)
    const classes = await btn.getAttribute('class') ?? ''
    const isEnabled = !classes.includes('line-through')

    if (isTarget && !isEnabled) {
      // Target game is disabled — click to enable
      await btn.click()
      await hostPage.waitForTimeout(200)
    } else if (!isTarget && isEnabled) {
      // Non-target game is enabled — click to disable
      await btn.click()
      await hostPage.waitForTimeout(200)
    }
  }
}

/**
 * Read the hidden emoji layout from the Memory grid.
 * Emojis are always in the DOM (hidden by CSS backface-visibility).
 * Returns an array of 16 emojis corresponding to card positions.
 */
async function readMemoryLayout(page: Page): Promise<string[]> {
  await page.waitForSelector('.grid-cols-4', { timeout: 15000 })
  return page.evaluate(() => {
    const buttons = document.querySelectorAll('.grid-cols-4 button')
    return Array.from(buttons).map(btn => {
      // The front face (second child div inside the card container) contains the emoji
      const cardContainer = btn.querySelector('[class*="transform-style"]')
      const faces = cardContainer?.querySelectorAll(':scope > div')
      // faces[0] = back (shows "?"), faces[1] = front (shows emoji)
      return faces?.[1]?.textContent?.trim() ?? ''
    })
  })
}

/**
 * Play Memory by clicking exactly `targetPairs` matching pairs.
 * Uses the known layout to click the right cards directly.
 */
async function playMemoryPairs(page: Page, layout: string[], targetPairs: number): Promise<number> {
  const grid = page.locator('.grid-cols-4 button')
  const matched = new Set<number>()
  let found = 0

  // Build a map of emoji → positions
  const emojiPositions = new Map<string, number[]>()
  layout.forEach((emoji, idx) => {
    if (!emoji) return
    const positions = emojiPositions.get(emoji) ?? []
    positions.push(idx)
    emojiPositions.set(emoji, positions)
  })

  // Click pairs until we reach targetPairs
  for (const [, positions] of emojiPositions) {
    if (found >= targetPairs) break
    if (positions.length < 2) continue

    const [a, b] = positions
    if (matched.has(a) || matched.has(b)) continue

    // Click first card
    await grid.nth(a).click()
    await page.waitForTimeout(400)

    // Click second card (matching)
    await grid.nth(b).click()
    await page.waitForTimeout(400)

    matched.add(a)
    matched.add(b)
    found++
  }

  return found
}

// ============================================================
// TEST
// ============================================================

test.describe('Memory — scoring précis', () => {
  test('host 3 paires (70pts) vs joueur 2 paires (45pts)', async ({ browser }) => {
    test.setTimeout(300000)

    // === SETUP ===
    const hostPage = await browser.newPage()
    const code = await createSession(hostPage, 'Alice')

    const playerPage = await browser.newPage()
    await joinSession(playerPage, 'Bob', code)
    await expect(hostPage.getByText('Bob')).toBeVisible({ timeout: 6000 })

    // Activer uniquement Memory
    await enableOnlyGame(hostPage, 'Memory')

    // 1 manche, vérifier le compteur
    await hostPage.getByRole('button', { name: '5', exact: true }).click()

    // Lancer la partie
    await hostPage.getByRole('button', { name: 'Lancer la partie !' }).click()

    // Attendre la page de jeu
    await hostPage.waitForURL(new RegExp(`/game/${code}`), { timeout: 30000 })
    await playerPage.waitForURL(new RegExp(`/game/${code}`), { timeout: 30000 })

    // Attendre que le memory s'affiche (grille 4x4)
    await hostPage.waitForSelector('.grid-cols-4', { timeout: 15000 })
    await playerPage.waitForSelector('.grid-cols-4', { timeout: 15000 })

    // === LIRE LES LAYOUTS ===
    const hostLayout = await readMemoryLayout(hostPage)
    const playerLayout = await readMemoryLayout(playerPage)

    console.log('Host layout:', hostLayout)
    console.log('Player layout:', playerLayout)

    // Vérifier qu'on a bien 16 cartes
    expect(hostLayout).toHaveLength(16)
    expect(playerLayout).toHaveLength(16)

    // === JOUER ===
    // Host trouve 3 paires
    const hostPairs = await playMemoryPairs(hostPage, hostLayout, 3)
    expect(hostPairs).toBe(3)

    // Joueur trouve 2 paires
    const playerPairs = await playMemoryPairs(playerPage, playerLayout, 2)
    expect(playerPairs).toBe(2)

    // Vérifier l'affichage des paires trouvées
    await expect(hostPage.getByText('3/8')).toBeVisible()
    await expect(playerPage.getByText('2/8')).toBeVisible()

    // === ATTENDRE LA FIN DU ROUND + RÉSULTATS ===
    // Le timer memory est 30s, puis transition 3s, puis résultats
    // Avec 1 seul jeu activé et 5 rounds, on aura 5 rounds de memory
    // Attendons la transition inter-manche d'abord
    await expect(hostPage.getByText(/Manche \d+ terminée/)).toBeVisible({ timeout: 45000 })

    // Vérifier les scores de la première manche
    // Host: 3 × 20 = 60 raw, rang 0 → bonus (2-0)×5 = 10 → total 70
    // Bob: 2 × 20 = 40 raw, rang 1 → bonus (2-1)×5 = 5 → total 45
    // Capturer les scores affichés dans la transition
    const scoreElements = await hostPage.locator('text=/\\+\\d+/').allTextContents()
    console.log('Scores affichés dans la transition:', scoreElements)

    // Vérifier que les scores attendus sont présents
    expect(scoreElements).toContain('+70')
    expect(scoreElements).toContain('+45')

    console.log('✅ Scores vérifiés — Host: 70pts, Bob: 45pts')

    // Attendre les résultats finaux
    await hostPage.waitForURL(new RegExp(`/results/${code}`), { timeout: 240000 })

    // Vérifier la page résultats
    await expect(hostPage.getByText('Fin de partie !')).toBeVisible()
    await expect(hostPage.getByText('Alice').first()).toBeVisible()
    await expect(hostPage.getByText('Bob').first()).toBeVisible()

    // Alice devrait avoir un score plus élevé que Bob
    const allScores = await hostPage.locator('text=/\\d+ pts/').allTextContents()
    console.log('Scores finaux:', allScores)
    expect(allScores.length).toBeGreaterThanOrEqual(2)

    await hostPage.close()
    await playerPage.close()
  })
})
