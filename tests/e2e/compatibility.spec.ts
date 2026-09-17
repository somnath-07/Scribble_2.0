import { expect, test } from '@playwright/test';

test('avatar controls, room invites, synchronized drawing and scoring work in this browser', async ({ browser, page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByTestId('player-name').fill('Browser Host');
  await page.getByRole('button', { name: 'Use body color #ff303f' }).click();
  await page.getByRole('button', { name: 'Next eyes', exact: true }).click();
  await page.getByRole('button', { name: 'Previous eyes', exact: true }).click();
  await page.getByRole('button', { name: 'Next mouth', exact: true }).click();
  await page.getByRole('button', { name: 'Next hair and headwear', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Your customized avatar' })).toHaveAttribute('data-body', '#ff303f');
  expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  await page.getByTestId('avatar-stage').screenshot({ path: testInfo.outputPath('avatar-stage.png') });
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  const context = await browser.newContext();
  const guest = await context.newPage();
  guest.on('pageerror', (error) => errors.push(error.message));
  await guest.goto(page.url());
  await guest.getByTestId('join-name').fill('Browser Guest');
  await guest.getByTestId('join-room').click();
  await expect(page.getByTestId('player-Browser Guest')).toBeVisible();
  await expect(guest.getByRole('img', { name: "Browser Host's avatar" })).toHaveAttribute('data-body', '#ff303f');
  await page.getByLabel('Rounds').selectOption('1');
  await page.getByTestId('start-game').click();
  for (let turn = 0; turn < 2; turn += 1) {
  await expect(page.getByTestId('word-selection')).toBeVisible();
  await expect(guest.getByTestId('word-selection')).toBeVisible();
  const drawer = await page.getByTestId('word-choice').count() ? page : guest;
  const guesser = drawer === page ? guest : page;
  const word = (await drawer.getByTestId('word-choice').first().innerText()).trim();
  await drawer.getByTestId('word-choice').first().click();
  await expect(drawer.getByTestId('word-selection')).toBeHidden();
  await expect(drawer.getByLabel('Drawing canvas. Use mouse, touch, or stylus to draw.')).toBeVisible();
  const canvas = drawer.getByTestId('drawing-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas missing');
  if (await drawer.evaluate(() => navigator.maxTouchPoints > 0)) {
    await drawer.touchscreen.tap(box.x + 30, box.y + 30);
  } else {
    await drawer.mouse.move(box.x + 20, box.y + 20);
    await drawer.mouse.down();
    await drawer.mouse.move(box.x + 90, box.y + 90, { steps: 8 });
    await drawer.mouse.up();
  }
  await expect.poll(() => guesser.getByTestId('drawing-canvas').evaluate((element: HTMLCanvasElement) => {
    const data = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
    return data.some((channel, index) => index % 4 !== 3 && channel < 240);
  })).toBe(true);
  await guesser.getByTestId('guess-input').fill(word);
  await guesser.getByTestId('guess-input').press('Enter');
  await expect(guesser.locator('.player-row').filter({ hasText: '(you)' }).locator('.score')).not.toHaveText('0');
  }
  await expect(page.getByText('Game over!')).toBeVisible();
  await context.close();
  expect(errors).toEqual([]);
});
