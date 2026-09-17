import { expect, test, type Page } from '@playwright/test';

const centerPixel = (page: Page) => page.getByTestId('drawing-canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(400, 300, 1, 1).data));

test('custom hidden words, fill, eraser, undo, sound and in-game kick protection work together', async ({ page, browser }) => {
  await page.clock.setSystemTime(Date.now() - 120_000);
  await page.goto('/');
  await page.getByTestId('player-name').fill('Controls Host');
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  const guestContext = await browser.newContext();
  try {
    const guest = await guestContext.newPage();
    await guest.goto(page.url());
    await guest.getByTestId('join-name').fill('Controls Guest');
    await guest.getByTestId('join-room').click();
    await expect(page.getByTestId('player-Controls Guest')).toBeVisible();
    await expect(guest.getByLabel('Draw time')).toBeDisabled();
    await page.getByLabel('Custom words', { exact: true }).fill('test planet');
    await page.getByLabel('Custom words', { exact: true }).press('Tab');
    await expect(guest.getByLabel('Custom words', { exact: true })).toHaveValue('test planet');
    // These controls are authoritative server state, not optimistic local state.
    await page.getByLabel('Use custom words only').click();
    await expect(page.getByLabel('Use custom words only')).toBeChecked();
    await page.getByRole('radio', { name: /Hidden/ }).click();
    await expect(guest.getByRole('radio', { name: /Hidden/ })).toBeChecked();
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('word-selection')).toBeVisible();
    await expect(guest.getByTestId('word-selection')).toBeVisible();
    const drawer = await page.getByTestId('word-choice').count() ? page : guest;
    const guesser = drawer === page ? guest : page;
    await expect(drawer.getByTestId('word-choice').first()).toHaveText('test planet');
    await drawer.getByTestId('word-choice').first().click();
    await expect(drawer.getByTestId('word-selection')).toBeHidden();
    await expect(page.locator('.timer strong')).toHaveText(/^01:(20|1[5-9])$/);
    await expect(guesser.getByTestId('word-display')).toHaveText('Secret word');
    await expect(guesser.getByLabel('Fill bucket (F)')).toBeDisabled();
    await drawer.getByLabel('Color #ef4444', { exact: true }).click();
    await drawer.getByLabel('Fill bucket (F)').click();
    await drawer.getByTestId('drawing-canvas').click();
    await expect.poll(() => centerPixel(guesser)).toEqual([239, 68, 68, 255]);
    await drawer.getByLabel('Eraser (E)').click();
    await drawer.getByLabel('Brush size 5', { exact: true }).click();
    await drawer.getByTestId('drawing-canvas').click();
    await expect.poll(() => centerPixel(guesser)).toEqual([255, 255, 255, 255]);
    await drawer.getByLabel('Undo (U)').click();
    await expect.poll(() => centerPixel(guesser)).toEqual([239, 68, 68, 255]);
    await drawer.getByLabel('Mute sound', { exact: true }).click();
    await expect(drawer.getByLabel('Turn sound on', { exact: true })).toBeVisible();
    await drawer.getByLabel('Turn sound on', { exact: true }).click();
    await expect(page.getByRole('button', { name: /^Kick / })).toHaveCount(0);
    await expect(guest.getByRole('button', { name: /^Kick / })).toHaveCount(0);
  } finally {
    await guestContext.close();
  }
});
