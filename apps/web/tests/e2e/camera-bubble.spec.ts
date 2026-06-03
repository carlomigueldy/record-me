import { expect, test } from '@playwright/test';

test.describe('camera bubble', () => {
  test('drag snaps to a corner and persists across reload', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('radio', { name: /screen \+ camera \+ cursor/i }).click();

    const handle = page.getByRole('button', { name: /camera bubble position/i });
    await expect(handle).toBeVisible();

    const stage = page.locator('.aspect-video').first();
    const box = (await stage.boundingBox())!;

    // Drag toward the top-left corner.
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1, { steps: 8 });
    await page.mouse.up();

    // Persisted preference reflects a top/left corner.
    const stored = await page.evaluate(() => localStorage.getItem('record-me-pip'));
    expect(stored).toBeTruthy();
    const pref = JSON.parse(stored!);
    expect(pref.v).toBe(1);
    expect(['tl', 'bl', 'tr']).toContain(pref.corner);

    // Survives reload.
    await page.reload();
    await page.getByRole('radio', { name: /screen \+ camera \+ cursor/i }).click();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('record-me-pip')!));
    expect(after.corner).toBe(pref.corner);
  });

  test('size control updates the persisted size', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('radio', { name: /screen \+ camera \+ cursor/i }).click();
    await page.getByRole('button', { name: /camera bubble position/i }).hover();
    await page.getByRole('radio', { name: /large/i }).click();
    const pref = await page.evaluate(() => JSON.parse(localStorage.getItem('record-me-pip')!));
    expect(pref.size).toBe('lg');
  });
});
