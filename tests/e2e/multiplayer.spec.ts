import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshots = 'test-results/screenshots';

async function profileOnHome(page: Page, name: string): Promise<void> {
  await page.getByTestId('player-name').fill(name);
}

async function joinInvite(browser: Browser, invite: string, name: string, viewport?: { width: number; height: number }): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(invite);
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-room').click();
  await expect(page.getByText(`${name} (you)`)).toBeVisible();
  return { context, page };
}

async function chooseDrawer(pageA: Page, pageB: Page): Promise<{ drawer: Page; guesser: Page; word: string }> {
  await expect(pageA.getByTestId('word-selection')).toBeVisible();
  const aChoices = pageA.getByTestId('word-choice');
  const drawer = await aChoices.count() > 0 ? pageA : pageB;
  const guesser = drawer === pageA ? pageB : pageA;
  const choice = drawer.getByTestId('word-choice').first();
  await expect(choice).toBeVisible();
  const word = (await choice.textContent())!.trim();
  await choice.click();
  await expect(drawer.getByLabel('Drawing canvas. Use mouse, touch, or stylus to draw.')).toBeVisible();
  await expect(guesser.getByTestId('word-display')).not.toHaveText(word.toUpperCase());
  return { drawer, guesser, word };
}

async function drawLine(page: Page): Promise<void> {
  const box = await page.getByTestId('drawing-canvas').boundingBox();
  if (!box) throw new Error('Canvas was not visible');
  await page.mouse.move(box.x + box.width * .22, box.y + box.height * .25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .62, box.y + box.height * .62, { steps: 14 });
  await page.mouse.up();
}

async function canvasHasInk(page: Page): Promise<boolean> {
  return page.getByTestId('drawing-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245) return true;
    }
    return false;
  });
}

test.beforeAll(async () => mkdir(screenshots, { recursive: true }));

test('player can customize their avatar from the mobile lobby and everyone sees it', async ({ browser }) => {
  const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  await host.goto('/');
  await profileOnHome(host, 'Avatar Host');
  await host.getByTestId('create-room').click();
  await expect(host).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  await host.getByTestId('customize-avatar').click();
  await expect(host.getByTestId('avatar-editor')).toBeVisible();
  await host.getByLabel('Use body color #7c4a2d').click();
  await host.getByRole('button', { name: 'Accessory' }).click();
  await host.screenshot({ path: `${screenshots}/lobby-avatar-customizer.png`, fullPage: true });
  await host.getByTestId('apply-avatar').click();
  await expect(host.getByTestId('avatar-editor')).toBeHidden();
  await expect(host.getByTestId('player-Avatar Host').locator('circle[fill="#7c4a2d"]')).toBeVisible();

  const guest = await joinInvite(browser, host.url(), 'Avatar Guest');
  await expect(guest.page.getByTestId('player-Avatar Host').locator('circle[fill="#7c4a2d"]')).toBeVisible();
  await host.screenshot({ path: `${screenshots}/lobby-mobile.png`, fullPage: true });
  await guest.context.close();
  await hostContext.close();
});

test('two isolated players complete a synchronized game and play again', async ({ browser, page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.screenshot({ path: `${screenshots}/home.png`, fullPage: true });
  await profileOnHome(page, 'Alex');
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  const invite = page.url();
  const second = await joinInvite(browser, invite, 'Blair');
  second.page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await expect(page.getByTestId('player-Blair')).toBeVisible();
  await expect(second.page.getByTestId('player-Alex')).toBeVisible();
  await page.screenshot({ path: `${screenshots}/lobby-two-players.png`, fullPage: true });

  await second.page.reload();
  await expect(second.page.getByTestId('player-Alex')).toBeVisible();
  await expect(page.getByTestId('player-Blair')).toBeVisible();
  await page.getByLabel('Rounds').selectOption('1');
  await expect(second.page.getByLabel('Rounds')).toHaveValue('1');
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('word-selection')).toBeVisible();
  await page.screenshot({ path: `${screenshots}/word-selection.png`, fullPage: true });

  const firstTurn = await chooseDrawer(page, second.page);
  await drawLine(firstTurn.drawer);
  await expect.poll(() => canvasHasInk(firstTurn.guesser)).toBe(true);
  await firstTurn.drawer.screenshot({ path: `${screenshots}/drawing-turn.png`, fullPage: true });
  await firstTurn.guesser.getByTestId('guess-input').fill('definitely wrong');
  await firstTurn.guesser.getByTestId('guess-input').press('Enter');
  await expect(firstTurn.drawer.getByText('definitely wrong')).toBeVisible();

  await firstTurn.drawer.getByLabel('Undo (U)').click();
  await expect.poll(() => canvasHasInk(firstTurn.guesser)).toBe(false);
  await drawLine(firstTurn.drawer);
  firstTurn.drawer.once('dialog', (dialog) => dialog.accept());
  await firstTurn.drawer.getByLabel('Clear canvas').click();
  await expect.poll(() => canvasHasInk(firstTurn.guesser)).toBe(false);
  await drawLine(firstTurn.drawer);
  await firstTurn.guesser.getByTestId('guess-input').fill(firstTurn.word);
  await firstTurn.guesser.getByTestId('guess-input').press('Enter');
  await expect(firstTurn.guesser.getByTestId('correct-guess')).toBeVisible();
  await expect(firstTurn.guesser.locator('.player-row').filter({ hasText: '(you)' }).locator('.score')).not.toHaveText('0');
  await firstTurn.guesser.screenshot({ path: `${screenshots}/guess-correct.png`, fullPage: true });

  await expect(page.getByTestId('word-selection')).toBeVisible({ timeout: 12_000 });
  const secondTurn = await chooseDrawer(page, second.page);
  expect(secondTurn.drawer).toBe(firstTurn.guesser);
  await drawLine(secondTurn.drawer);
  await expect.poll(() => canvasHasInk(secondTurn.guesser)).toBe(true);
  await secondTurn.guesser.getByTestId('guess-input').fill(secondTurn.word);
  await secondTurn.guesser.getByTestId('guess-input').press('Enter');
  await expect(page.getByText('Game over!')).toBeVisible({ timeout: 12_000 });
  await page.screenshot({ path: `${screenshots}/results.png`, fullPage: true });
  await page.getByTestId('play-again').click();
  await expect(page.getByTestId('word-selection')).toBeVisible();

  const mobile = await joinInvite(browser, invite, 'Casey', { width: 390, height: 844 });
  await mobile.page.screenshot({ path: `${screenshots}/mobile.png` });
  await mobile.context.close();
  await second.context.close();
  expect(errors).toEqual([]);
});

test('room capacity is enforced by the server', async ({ browser, page }) => {
  await page.goto('/');
  await profileOnHome(page, 'Host');
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  const invite = page.url();
  await page.getByLabel('Player limit').selectOption('2');
  const second = await joinInvite(browser, invite, 'Guest');
  const thirdContext = await browser.newContext();
  const third = await thirdContext.newPage();
  await third.goto(invite);
  await third.getByTestId('join-name').fill('Too Many');
  await third.getByTestId('join-room').click();
  await expect(third.getByText('This room is full.')).toBeVisible();
  await second.context.close();
  await thirdContext.close();
});

test('server timer expires a drawing turn without browser authority', async ({ browser, page }) => {
  test.setTimeout(70_000);
  await page.goto('/');
  await profileOnHome(page, 'Timer Host');
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  const second = await joinInvite(browser, page.url(), 'Timer Guest');
  await page.getByLabel('Rounds').selectOption('1');
  await page.getByLabel('Draw time').selectOption('30');
  await page.getByTestId('start-game').click();
  const turn = await chooseDrawer(page, second.page);
  await expect(turn.drawer.getByText('The word was')).toBeVisible({ timeout: 40_000 });
  await second.context.close();
});

test('host transfers to the longest-connected player after reconnect grace', async ({ browser, page }) => {
  test.setTimeout(80_000);
  await page.goto('/');
  await profileOnHome(page, 'Leaving Host');
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  const second = await joinInvite(browser, page.url(), 'New Host');
  await page.close();
  await expect(second.page.getByTestId('start-game')).toBeVisible({ timeout: 68_000 });
  await expect(second.page.getByText('You’re host')).toBeVisible();
  await second.context.close();
});
