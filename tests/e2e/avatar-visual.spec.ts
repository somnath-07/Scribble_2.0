import { expect, test, type Page } from '@playwright/test';

async function choose(page: Page, part: string, name: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await page.locator('.avatar-selection').innerText()).includes(name)) return;
    await page.getByRole('button', { name: `Next ${part}`, exact: true }).click();
  }
  await expect(page.locator('.avatar-selection')).toContainText(name);
}

test('reference-inspired avatar combinations stay crisp and usable on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const variants = [
    { name: 'red-pirate', color: '#ff303f', eyes: 'Eyepatch', mouth: 'Surprised', accessory: 'Headband' },
    { name: 'cyan-visor', color: '#21deec', eyes: 'Cyber visor', mouth: 'Moustache', accessory: 'Bandana' },
    { name: 'round-glasses', color: '#f6c7a8', eyes: 'Round glasses', mouth: 'Big grin', accessory: 'No accessory' },
  ];
  for (const variant of variants) {
    await page.getByRole('button', { name: `Use body color ${variant.color}` }).click();
    await choose(page, 'eyes', variant.eyes);
    await choose(page, 'mouth', variant.mouth);
    await choose(page, 'hair and headwear', variant.accessory);
    await expect(page.getByRole('img', { name: 'Your customized avatar' })).toHaveAttribute('data-body', variant.color);
    await expect.poll(() => page.locator('.avatar-preview img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.getByTestId('avatar-stage').screenshot({ path: testInfo.outputPath(`${variant.name}.png`), scale: 'css' });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-home.png'), fullPage: true, scale: 'css' });
});

test('avatar arrows follow head, eyes, mouth order and change only the matching part on home and in lobby', async ({ page }, testInfo) => {
  await page.goto('/');
  const checkRows = async () => {
    const stage = page.getByTestId('avatar-stage');
    const left = stage.locator('.avatar-arrows').first().getByRole('button');
    const right = stage.locator('.avatar-arrows').last().getByRole('button');
    const labels = ['hair and headwear', 'eyes', 'mouth'];
    const layerState = () => stage.locator('.avatar-preview').evaluate(element => {
      const sources = Array.from(element.querySelectorAll('img')).map(image => image.getAttribute('src')!);
      return ['accessory-', 'eyes-', 'mouth-'].map(part => sources.find(src => src.includes(part)) ?? null);
    });
    for (let row = 0; row < 3; row++) {
      await expect(left.nth(row)).toHaveAttribute('aria-label', `Previous ${labels[row]}`);
      await expect(right.nth(row)).toHaveAttribute('aria-label', `Next ${labels[row]}`);
      const before = await layerState();
      await right.nth(row).click();
      const after = await layerState();
      expect(after[row]).not.toBe(before[row]);
      for (let other = 0; other < 3; other++) if (other !== row) expect(after[other]).toBe(before[other]);
      await left.nth(row).click();
      expect(await layerState()).toEqual(before);
      for (let step = 0; step < 4; step++) await right.nth(row).click();
      expect(await layerState()).toEqual(before);
    }
  };
  await checkRows();
  await page.getByTestId('player-name').fill('Arrow Order');
  await page.getByTestId('create-room').click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}$/);
  await page.getByTestId('customize-avatar').click();
  await expect(page.getByTestId('avatar-editor')).toBeVisible();
  await checkRows();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('avatar-editor').screenshot({ path: testInfo.outputPath('avatar-arrow-order.png') });
});
