import { expect, test, type Browser, type Page } from '@playwright/test';

async function create(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('player-name').fill(name);
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
}
async function join(browser: Browser, invite: string, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(invite);
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-room').click();
  await expect(page.getByTestId(`player-${name}`)).toBeVisible();
  return { context, page };
}
async function leave(page: Page, accept = true) {
  page.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
  await page.getByRole('button', { name: 'Leave room and go home' }).click();
  if (accept) await expect(page).toHaveURL(/\/$/);
}

test('lobby logo confirms leaving, transfers host immediately and avatars are no longer edit buttons', async ({ browser, page }, testInfo) => {
  await create(page, 'Original Host');
  const invite = page.url();
  const guest = await join(browser, invite, 'Next Host');
  try {
    await expect(page.getByRole('button', { name: 'Customize', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Customize your avatar', exact: true })).toHaveCount(0);
    await page.getByRole('img', { name: "Original Host's avatar" }).click();
    await expect(page.getByTestId('avatar-editor')).toHaveCount(0);
    await page.getByTestId('customize-avatar').click();
    await expect(page.getByTestId('avatar-editor')).toBeVisible();
    await page.getByLabel('Close avatar editor').click();
    await leave(page, false);
    await expect(page).toHaveURL(invite);
    const logo = await page.getByRole('button', { name: 'Leave room and go home' }).boundingBox();
    const players = await page.locator('.lobby-players').boundingBox();
    expect(Math.abs(logo!.x - players!.x)).toBeLessThan(3);
    await expect(page.getByLabel('Lobby status')).toContainText('Waiting');
    expect(await page.getByLabel('Lobby status').evaluate(el => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
    await page.screenshot({ path: testInfo.outputPath('lobby-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('lobby-mobile.png'), fullPage: true });
    await leave(page);
    await expect(guest.page.getByText('You’re host')).toBeVisible({ timeout: 5_000 });
    await expect(guest.page.getByTestId('start-game')).toBeDisabled();
    await guest.page.waitForTimeout(2_000);
    await expect(guest.page.getByTestId('player-Next Host')).not.toHaveClass(/offline/);
    const roomId = invite.split('/').at(-1);
    expect((await (await guest.page.request.get(`/api/rooms/${roomId}`)).json()).expiresAt).toBeNull();
  } finally { await guest.context.close(); }
});

test('game fits desktop and mobile, reactions synchronize, and leaving declares the sole player winner', async ({ browser, page }, testInfo) => {
  await create(page, 'Remaining Artist');
  const guest = await join(browser, page.url(), 'Leaving Artist');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  guest.page.on('pageerror', error => errors.push(error.message));
  try {
    await page.getByLabel('Draw time').selectOption('180');
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('word-selection')).toBeVisible();
    await expect(guest.page.getByTestId('word-selection')).toBeVisible();
    const drawer = await page.getByTestId('word-choice').count() ? page : guest.page;
    const guesser = drawer === page ? guest.page : page;
    await drawer.getByTestId('word-choice').first().click();
    await expect(drawer.getByTestId('word-selection')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Kick / })).toHaveCount(0);
    await expect(drawer.getByRole('button', { name: 'Like drawing', exact: true })).toBeDisabled();
    await guesser.getByRole('button', { name: 'Like drawing', exact: true }).click();
    await expect(drawer.getByTestId('drawing-likes')).toHaveText('1');
    await guesser.getByRole('button', { name: 'Dislike drawing', exact: true }).click();
    await expect(drawer.getByTestId('drawing-likes')).toHaveText('0');
    await expect(drawer.getByTestId('drawing-dislikes')).toHaveText('1');
    await guesser.reload();
    await expect(guesser.getByRole('button', { name: 'Dislike drawing', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (const [width, height] of [[1497, 866], [1280, 720], [1024, 768], [390, 844], [320, 568], [844, 390]]) {
      await page.setViewportSize({ width, height });
      const bounds = await page.locator('.drawing-tools, .chat-input, .drawing-reactions, .canvas-frame').evaluateAll(elements => elements.map(el => {
        const r = el.getBoundingClientRect();
        return { bottom: r.bottom, right: r.right, top: r.top, left: r.left };
      }));
      for (const r of bounds) {
        expect(r.bottom).toBeLessThanOrEqual(height + 1);
        expect(r.right).toBeLessThanOrEqual(width + 1);
        expect(r.top).toBeGreaterThanOrEqual(0);
        expect(r.left).toBeGreaterThanOrEqual(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`game-${width}x${height}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await leave(guest.page);
    await expect(page.getByTestId('winner-announcement')).toHaveText('Remaining Artist wins as the last remaining player!');
    await expect(page.getByTestId('podium-rank-1')).toContainText('Remaining Artist');
    await expect(page.getByTestId('play-again')).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath('last-player-winner.png'), fullPage: true });
    await page.getByRole('button', { name: 'Back to lobby', exact: true }).click();
    await expect(page.getByText('You’re host')).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await guest.context.close(); }
});

test('four-player results show three podium places and only fourth place below', async ({ browser, page }, testInfo) => {
  test.setTimeout(120_000);
  await create(page, 'Artist One');
  const guests = [];
  try {
    for (const name of ['Artist Two', 'Artist Three', 'Artist Four']) guests.push(await join(browser, page.url(), name));
    await page.getByLabel('Rounds').selectOption('1');
    await page.getByTestId('start-game').click();
    const players = [page, ...guests.map(guest => guest.page)];
    for (let turn = 0; turn < 4; turn++) {
      for (const player of players) await expect(player.getByTestId('word-selection')).toBeVisible();
      const choices = await Promise.all(players.map(player => player.getByTestId('word-choice').count()));
      const drawer = players[choices.findIndex(count => count > 0)];
      const word = (await drawer.getByTestId('word-choice').first().innerText()).trim();
      await drawer.getByTestId('word-choice').first().click();
      for (const guesser of players.filter(player => player !== drawer)) {
        await expect(guesser.getByTestId('word-selection')).toBeHidden();
        await guesser.getByTestId('guess-input').fill(word);
        await guesser.getByTestId('guess-input').press('Enter');
      }
    }
    await expect(page.getByText('Game over!', { exact: true })).toBeVisible();
    await expect(page.locator('.podium-place')).toHaveCount(3);
    await expect(page.locator('.final-list li')).toHaveCount(1);
    await expect(page.locator('.final-list li')).toContainText('#4');
    await page.screenshot({ path: testInfo.outputPath('podium-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('podium-mobile.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { for (const guest of guests) await guest.context.close(); }
});
