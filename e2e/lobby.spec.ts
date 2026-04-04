import { test, expect, type Page } from '@playwright/test'

// Helper : crée une session et retourne le code
async function createSession(page: Page, pseudo: string): Promise<string> {
  await page.goto('/')
  await page.getByPlaceholder('Ton pseudo').fill(pseudo)
  await page.getByText('Créer une partie').click()
  await page.getByText('Lancer la partie !').click()
  // Attendre navigation vers /lobby/XXXXXX
  await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/, { timeout: 10000 })
  const url = page.url()
  return url.split('/lobby/')[1]
}

// Helper : rejoint une session existante
async function joinSession(page: Page, pseudo: string, code: string) {
  await page.goto('/')
  await page.getByPlaceholder('Ton pseudo').fill(pseudo)
  await page.getByText('Rejoindre').click()
  await page.getByPlaceholder(/code/i).fill(code)
  await page.getByText('Rejoindre !').click()
  await page.waitForURL(`/lobby/${code}`, { timeout: 10000 })
}

test.describe('Homepage', () => {
  test('affiche le titre dolympia', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('dolympia!')).toBeVisible()
  })

  test('affiche les boutons Créer et Rejoindre après saisie du pseudo', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Ton pseudo').fill('TestUser')
    await expect(page.getByText('Créer une partie')).toBeVisible()
    await expect(page.getByText('Rejoindre')).toBeVisible()
  })

  test('affiche le formulaire de code quand on clique Rejoindre', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Ton pseudo').fill('TestUser')
    await page.getByText('Rejoindre').click()
    await expect(page.getByPlaceholder(/code/i)).toBeVisible()
  })

  test('affiche erreur si pseudo vide', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Créer une partie').click()
    await page.getByText('Lancer la partie !').click()
    await expect(page.getByText('Entre ton pseudo')).toBeVisible()
  })
})

test.describe('Création de session', () => {
  test('redirige vers /lobby/CODE après création', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Ton pseudo').fill('Alice')
    await page.getByText('Créer une partie').click()
    await page.getByText('Lancer la partie !').click()
    await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/, { timeout: 10000 })
    expect(page.url()).toMatch(/\/lobby\/[A-Z0-9]{6}/)
  })

  test('affiche le code de la partie dans le lobby', async ({ page }) => {
    const code = await createSession(page, 'Alice')
    await expect(page.getByText(code)).toBeVisible()
  })

  test('le host voit le bouton Lancer la partie', async ({ page }) => {
    await createSession(page, 'Alice')
    await expect(page.getByText('🚀 Lancer la partie !')).toBeVisible()
  })

  test('le host voit Alice dans la liste', async ({ page }) => {
    await createSession(page, 'Alice')
    await expect(page.getByText('Alice')).toBeVisible()
    await expect(page.getByText('Host')).toBeVisible()
  })
})

test.describe('Rejoindre une session', () => {
  test('erreur avec code invalide', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Ton pseudo').fill('Bob')
    await page.getByText('Rejoindre').click()
    await page.getByPlaceholder(/code/i).fill('XXXXXX')
    await page.getByText('Rejoindre !').click()
    await expect(page.getByText(/invalide|commencée/i)).toBeVisible({ timeout: 8000 })
  })

  test('un joueur peut rejoindre une session existante', async ({ browser }) => {
    // Onglet host
    const hostPage = await browser.newPage()
    const code = await createSession(hostPage, 'Alice')

    // Onglet joueur
    const playerPage = await browser.newPage()
    await joinSession(playerPage, 'Bob', code)

    await expect(playerPage.getByText(code)).toBeVisible()
    await expect(playerPage.getByText('⏳ En attente du host...')).toBeVisible()

    await hostPage.close()
    await playerPage.close()
  })

  test('le host voit le joueur apparaître dans la liste (polling)', async ({ browser }) => {
    const hostPage = await browser.newPage()
    const code = await createSession(hostPage, 'Alice')

    const playerPage = await browser.newPage()
    await joinSession(playerPage, 'Bob', code)

    // Attendre max 5s que le host voit Bob (polling 2s)
    await expect(hostPage.getByText('Bob')).toBeVisible({ timeout: 6000 })

    await hostPage.close()
    await playerPage.close()
  })
})

test.describe('Lancement de partie', () => {
  test('le host navigue vers /game après avoir lancé', async ({ browser }) => {
    const hostPage = await browser.newPage()
    const code = await createSession(hostPage, 'Alice')

    await hostPage.getByText('🚀 Lancer la partie !').click()
    await hostPage.waitForURL(`/game/${code}`, { timeout: 10000 })
    expect(hostPage.url()).toContain(`/game/${code}`)

    await hostPage.close()
  })

  test('les joueurs naviguent aussi vers /game quand le host lance', async ({ browser }) => {
    const hostPage = await browser.newPage()
    const code = await createSession(hostPage, 'Alice')

    const playerPage = await browser.newPage()
    await joinSession(playerPage, 'Bob', code)

    // Attendre que Bob soit visible chez le host
    await expect(hostPage.getByText('Bob')).toBeVisible({ timeout: 6000 })

    // Host lance
    await hostPage.getByText('🚀 Lancer la partie !').click()

    // Les deux naviguent vers /game
    await hostPage.waitForURL(`/game/${code}`, { timeout: 10000 })
    await playerPage.waitForURL(`/game/${code}`, { timeout: 10000 })

    await hostPage.close()
    await playerPage.close()
  })
})
