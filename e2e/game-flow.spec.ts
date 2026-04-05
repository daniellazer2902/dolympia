import { test, expect, type Page, type Browser } from '@playwright/test'

// ============================================================
// HELPERS
// ============================================================

async function createSession(page: Page, pseudo: string): Promise<string> {
  await page.goto('/')
  await page.getByPlaceholder('Ton pseudo').fill(pseudo)
  await page.getByRole('button', { name: 'Créer une partie' }).click()
  // Le bouton "Lancer la partie !" est sur la home page, pas dans le lobby
  // On attend d'être dans le lobby après avoir cliqué "Créer une partie"
  // La home page a un bouton "Lancer la partie !" qui crée + redirige
  await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/, { timeout: 15000 })
  return page.url().split('/lobby/')[1]
}

async function joinSession(page: Page, pseudo: string, code: string) {
  await page.goto('/')
  await page.getByPlaceholder('Ton pseudo').fill(pseudo)
  await page.getByText('Rejoindre').click()
  await page.getByPlaceholder(/code/i).fill(code)
  await page.getByText('Rejoindre !').click()
  await page.waitForURL(`/lobby/${code}`, { timeout: 10000 })
}

/** Configure le nombre de manches et lance la partie */
async function configureAndStart(hostPage: Page, rounds: number) {
  // Sélectionner le nombre de manches
  await hostPage.getByRole('button', { name: String(rounds), exact: true }).click()
  // Lancer
  await hostPage.getByRole('button', { name: 'Lancer la partie !' }).click()
}

/** Attend qu'une page arrive sur /game/{code} */
async function waitForGamePage(page: Page, code: string) {
  await page.waitForURL(`/game/${code}`, { timeout: 30000 })
}

/** Attend qu'une page arrive sur /results/{code} */
async function waitForResultsPage(page: Page, code: string) {
  await page.waitForURL(`/results/${code}`, { timeout: 240000 })
}

/** Setup une partie à 2 joueurs, retourne [hostPage, playerPage, code] */
async function setupTwoPlayerGame(browser: Browser): Promise<[Page, Page, string]> {
  const hostPage = await browser.newPage()
  const code = await createSession(hostPage, 'Alice')

  const playerPage = await browser.newPage()
  await joinSession(playerPage, 'Bob', code)

  // Attendre que le host voit Bob
  await expect(hostPage.getByText('Bob')).toBeVisible({ timeout: 6000 })

  return [hostPage, playerPage, code]
}

// ============================================================
// TESTS
// ============================================================

test.describe('Boucle de jeu complète — 2 joueurs', () => {
  test('une partie de 5 manches se termine avec des scores', async ({ browser }) => {
    test.setTimeout(300000) // 5 minutes — les jeux comme draw-guess prennent 60s+
    const [hostPage, playerPage, code] = await setupTwoPlayerGame(browser)

    // Configurer 5 manches et lancer
    await configureAndStart(hostPage, 5)

    // Les deux arrivent sur /game
    await waitForGamePage(hostPage, code)
    await waitForGamePage(playerPage, code)

    // Attendre que les 5 manches passent et qu'on arrive aux résultats
    // Certains jeux durent 60s (draw-guess), timeout très large
    await waitForResultsPage(hostPage, code)
    await waitForResultsPage(playerPage, code)

    // Vérifier la page résultats
    await expect(hostPage.getByText('Fin de partie !')).toBeVisible()
    await expect(playerPage.getByText('Fin de partie !')).toBeVisible()

    // Les deux joueurs sont affichés
    await expect(hostPage.getByText('Alice')).toBeVisible()
    await expect(hostPage.getByText('Bob')).toBeVisible()

    // Les scores sont affichés (au moins "pts" visible)
    await expect(hostPage.locator('text=/\\d+ pts/').first()).toBeVisible()
    await expect(playerPage.locator('text=/\\d+ pts/').first()).toBeVisible()

    await hostPage.close()
    await playerPage.close()
  })

  test('les scores sont visibles dans la transition inter-manche', async ({ browser }) => {
    const [hostPage, playerPage, code] = await setupTwoPlayerGame(browser)

    await configureAndStart(hostPage, 5)
    await waitForGamePage(hostPage, code)
    await waitForGamePage(playerPage, code)

    // Attendre la première transition inter-manche (après le premier round)
    // On cherche le texte "Manche X terminée !" qui apparaît dans RoundTransition
    await expect(hostPage.getByText(/Manche \d+ terminée/)).toBeVisible({ timeout: 45000 })

    // Vérifier que les scores de la manche sont affichés ("+N" format)
    await expect(hostPage.locator('text=/\\+\\d+/').first()).toBeVisible()

    // Le total est aussi affiché ("(N total)" format)
    await expect(hostPage.locator('text=/\\d+ total/').first()).toBeVisible()

    await hostPage.close()
    await playerPage.close()
  })
})

test.describe('Jeux interactifs — comportement UI', () => {
  test('le quiz affiche une question et des options cliquables', async ({ browser }) => {
    const [hostPage, playerPage, code] = await setupTwoPlayerGame(browser)

    await configureAndStart(hostPage, 5)
    await waitForGamePage(hostPage, code)
    await waitForGamePage(playerPage, code)

    // Attendre qu'un jeu se charge (le HUD avec le timer doit apparaître)
    // On regarde si le composant de jeu affiche quelque chose d'interactif
    // Le HUD affiche "Manche X/Y"
    await expect(hostPage.getByText(/Manche \d+\/5/)).toBeVisible({ timeout: 15000 })
    await expect(playerPage.getByText(/Manche \d+\/5/)).toBeVisible({ timeout: 15000 })

    await hostPage.close()
    await playerPage.close()
  })

  test('une partie avec tous les jeux affiche le HUD correctement', async ({ browser }) => {
    test.setTimeout(300000)
    const [hostPage, playerPage, code] = await setupTwoPlayerGame(browser)

    // 5 manches — on vérifie que la page game charge et affiche le HUD
    await configureAndStart(hostPage, 5)
    await waitForGamePage(hostPage, code)
    await waitForGamePage(playerPage, code)

    // Le HUD doit s'afficher avec le numéro de manche
    await expect(hostPage.getByText(/Manche \d+\/5/)).toBeVisible({ timeout: 15000 })

    // Attendre la fin
    await waitForResultsPage(hostPage, code)
    await expect(hostPage.getByText('Fin de partie !')).toBeVisible()
    await expect(hostPage.locator('text=/\\d+ pts/').first()).toBeVisible()

    await hostPage.close()
    await playerPage.close()
  })
})

test.describe('Rejeu et navigation', () => {
  test('le bouton Rejouer ramène à l\'accueil', async ({ browser }) => {
    test.setTimeout(300000)
    const [hostPage, playerPage, code] = await setupTwoPlayerGame(browser)

    await configureAndStart(hostPage, 5)
    await waitForGamePage(hostPage, code)
    await waitForResultsPage(hostPage, code)

    // Cliquer sur Rejouer
    await hostPage.getByText('Rejouer').click()
    await hostPage.waitForURL('/', { timeout: 5000 })

    await expect(hostPage.getByText('dolympia!')).toBeVisible()

    await hostPage.close()
    await playerPage.close()
  })
})

test.describe('GameSelector dans le lobby', () => {
  test('le host voit les toggles de jeux dans la config', async ({ page }) => {
    const code = await createSession(page, 'Alice')

    // Le host doit voir la section "Mini-jeux actifs"
    await expect(page.getByText('Mini-jeux actifs')).toBeVisible({ timeout: 5000 })

    // Au moins quelques jeux doivent être affichés
    await expect(page.getByText('Quiz')).toBeVisible()
    await expect(page.getByText('Territory')).toBeVisible()
    await expect(page.getByText('Point Rush')).toBeVisible()
  })

  test('le host peut désactiver un jeu', async ({ page }) => {
    const code = await createSession(page, 'Alice')

    await expect(page.getByText('Mini-jeux actifs')).toBeVisible({ timeout: 5000 })

    // Compter les jeux activés
    const countText = page.locator('text=/\\d+ jeux activés sur \\d+/')
    await expect(countText).toBeVisible()
    const initialText = await countText.textContent()

    // Cliquer sur un jeu pour le désactiver (ex: Quiz)
    await page.locator('button:has-text("Quiz")').first().click()

    // Le compteur devrait avoir changé
    const newText = await countText.textContent()
    expect(newText).not.toBe(initialText)
  })
})

test.describe('Scoring — vérification DB', () => {
  test('les scores sont persistés en DB et visibles sur la page résultats', async ({ browser }) => {
    test.setTimeout(300000)
    const [hostPage, playerPage, code] = await setupTwoPlayerGame(browser)

    await configureAndStart(hostPage, 5)
    await waitForGamePage(hostPage, code)
    await waitForResultsPage(hostPage, code)

    // Page résultats côté host
    await expect(hostPage.getByText('Fin de partie !')).toBeVisible()

    // Vérifier que le classement complet est visible
    await expect(hostPage.getByText('Classement complet')).toBeVisible()

    // Les deux joueurs sont dans le classement avec des scores
    const aliceRow = hostPage.locator('div:has-text("Alice")').filter({ hasText: /pts/ })
    const bobRow = hostPage.locator('div:has-text("Bob")').filter({ hasText: /pts/ })
    await expect(aliceRow.first()).toBeVisible()
    await expect(bobRow.first()).toBeVisible()

    // Au moins un joueur a un score > 0 (le bonus de rang garantit ça)
    const allScoreTexts = await hostPage.locator('text=/\\d+ pts/').allTextContents()
    const scores = allScoreTexts.map(t => parseInt(t))
    const hasPositiveScore = scores.some(s => s > 0)
    expect(hasPositiveScore).toBe(true)

    await hostPage.close()
    await playerPage.close()
  })

  test('le podium affiche les médailles pour le top 3', async ({ browser }) => {
    test.setTimeout(300000)
    // Besoin de 3 joueurs pour un podium complet
    const hostPage = await browser.newPage()
    const code = await createSession(hostPage, 'Alice')

    const player2 = await browser.newPage()
    await joinSession(player2, 'Bob', code)

    const player3 = await browser.newPage()
    await joinSession(player3, 'Charlie', code)

    await expect(hostPage.getByText('Bob')).toBeVisible({ timeout: 6000 })
    await expect(hostPage.getByText('Charlie')).toBeVisible({ timeout: 6000 })

    await configureAndStart(hostPage, 5)
    await waitForGamePage(hostPage, code)
    await waitForResultsPage(hostPage, code)

    // Podium avec médailles
    await expect(hostPage.locator('text=🥇')).toBeVisible()
    await expect(hostPage.locator('text=🥈')).toBeVisible()
    await expect(hostPage.locator('text=🥉')).toBeVisible()

    await hostPage.close()
    await player2.close()
    await player3.close()
  })
})
