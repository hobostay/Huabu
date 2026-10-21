// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect, test } from '@playwright/test';

test.use({ hasTouch: false });

for (const width of [320, 1024]) {
  for (const theme of ['light', 'dark']) {
    test(`popover edge cases remain usable at ${width}px in ${theme}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/playground/node-toolbars');
      await expect(page.locator('.nt-toolbar')).toHaveCount(12);
      await page.evaluate(async (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        const load = (path: string) => import(/* @vite-ignore */ path);
        const { mountPopoverBehaviorFixture } = await load(
          '/e2e/fixtures/popover-behavior.tsx',
        );
        mountPopoverBehaviorFixture();
      }, theme);

      await page
        .locator('[data-long-agents]')
        .getByRole('button', { name: 'Chat', exact: true })
        .click();
      const last = page.getByRole('menuitem', {
        name: 'Agent 34',
        exact: true,
      });
      const agents = last.locator(
        'xpath=ancestor::*[@data-floating-chrome][1]',
      );
      await expect(agents).toHaveCSS('overflow-y', 'auto');
      const bounds = await agents.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds?.height).toBeLessThanOrEqual(776);
      await agents.screenshot({
        path: test.info().outputPath('long-agent-list.png'),
        animations: 'disabled',
      });
      await last.click();
      await expect(page.locator('[data-behavior-result]')).toHaveText(
        'Agent 34',
      );

      await page
        .getByRole('button', { name: 'AI Summary', exact: true })
        .click();
      const summary = page.getByRole('dialog', { name: 'AI Summary' });
      await expect(summary).toBeVisible();
      expect(
        await summary.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      const keyword = summary.getByText('LongUnbrokenKeyword'.repeat(15), {
        exact: true,
      });
      await keyword.scrollIntoViewIfNeeded();
      await expect(keyword).toBeInViewport();
      expect(
        await keyword.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await summary.screenshot({
        path: test.info().outputPath('summary-wrapping.png'),
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await expect(summary).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'AI Summary', exact: true }),
      ).toBeFocused();

      const thickness = page.getByRole('button', {
        name: 'Audit thickness: 4',
      });
      await thickness.click();
      await expect(page.getByRole('slider')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('slider')).toHaveCount(0);
      await expect(thickness).toBeFocused();

      await page.getByRole('textbox').click();
      await page.getByRole('textbox').press('ControlOrMeta+a');
      const blockTrigger = page.getByRole('button', {
        name: 'Text',
        exact: true,
      });
      await expect(blockTrigger).toBeVisible();
      await blockTrigger.focus();
      await blockTrigger.press('ArrowDown');
      const menu = page.getByRole('menu');
      const contrast = await menu
        .getByText('Advanced', { exact: true })
        .evaluate((label) => {
          const panel = label.closest('[data-floating-chrome]');
          if (!panel) throw new Error('Missing menu surface');
          const context = document.createElement('canvas').getContext('2d');
          if (!context) throw new Error('Missing color conversion context');
          const luminance = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const pixel = context.getImageData(0, 0, 1, 1).data;
            const linear = [pixel[0], pixel[1], pixel[2]].map((byte) => {
              const value = byte / 255;
              return value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
            });
            return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
          };
          const foreground = luminance(getComputedStyle(label).color);
          const background = luminance(getComputedStyle(panel).backgroundColor);
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      const first = menu.getByRole('menuitem', { name: 'Text', exact: true });
      await expect(menu.getByText('List', { exact: true })).toHaveCSS(
        'font-weight',
        '500',
      );
      await expect(
        menu.getByText('List', { exact: true }).locator('..'),
      ).toHaveCSS('margin-top', '8px');
      await expect(first).toHaveCSS('font-weight', '400');
      await expect(first).toBeFocused();
      await menu.screenshot({
        path: test.info().outputPath('block-menu.png'),
        animations: 'disabled',
      });
      await menu.getByText('List', { exact: true }).scrollIntoViewIfNeeded();
      await menu.screenshot({
        path: test.info().outputPath('block-menu-groups.png'),
        animations: 'disabled',
      });
      await page.keyboard.press('ArrowDown');
      await expect(
        menu.getByRole('menuitem', { name: 'Heading 1', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('End');
      await expect(menu.getByRole('menuitem').last()).toBeFocused();
      await page.keyboard.press('Home');
      await expect(first).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(blockTrigger).toBeFocused();
      await blockTrigger.press('ArrowDown');
      await first.press('Enter');
      await expect(menu).toHaveCount(0);

      const editedMarker = page.getByRole('button', {
        name: 'Review AI changes to this block',
        exact: true,
      });
      await page.getByRole('textbox').locator('p').hover();
      await expect(page.locator('[data-prov-popover]')).toHaveCount(0);
      await editedMarker.hover();
      const hoverDiff = page.getByRole('dialog', {
        name: 'Review AI changes to this block',
        exact: true,
      });
      await expect(hoverDiff).toBeVisible();
      await expect(hoverDiff.getByRole('button').first()).not.toBeFocused();
      await hoverDiff.hover();
      await page.waitForTimeout(200);
      await expect(hoverDiff).toBeVisible();
      await page.mouse.move(0, 0);
      await expect(hoverDiff).toHaveCount(0);

      for (const label of [
        'Review AI changes to this block',
        'Review 1 AI-deleted block',
      ]) {
        const marker = page.getByRole('button', { name: label, exact: true });
        await marker.focus();
        await marker.press('Enter');
        const diff = page.getByRole('dialog', { name: label, exact: true });
        await expect(diff).toBeVisible();
        await expect(diff.getByRole('button').first()).toBeFocused();
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
        await expect(diff).toBeVisible();
        await diff.screenshot({
          path: test
            .info()
            .outputPath(
              `diff-${label.includes('deleted') ? 'deleted' : 'modified'}.png`,
            ),
          animations: 'disabled',
        });
        await page.keyboard.press('Escape');
        await expect(diff).toHaveCount(0);
        await expect(marker).toBeFocused();
      }

      const marker = page.getByRole('button', {
        name: 'Review 1 AI-deleted block',
        exact: true,
      });
      await marker.press('Enter');
      await page
        .getByRole('dialog', { name: 'Review 1 AI-deleted block' })
        .getByRole('button', { name: 'Reject', exact: true })
        .click();
      await expect(page.locator('[data-behavior-result]')).toHaveText(
        'restored',
      );
      await expect(marker).toBeFocused();
      await marker.press('Enter');
      await page
        .getByRole('button', { name: 'Outside action', exact: true })
        .click();
      await expect(page.locator('[data-prov-popover]')).toHaveCount(0);
      await expect(page.locator('[data-behavior-result]')).toHaveText(
        'outside',
      );
      const editor = page.getByRole('textbox');
      await editor.click();
      await editor.press('ControlOrMeta+a');
      await editor.press('Backspace');
      await editor.press('/');
      const slash = page.locator('.milkdown-slash-menu:visible');
      await expect(slash).toBeVisible();
      const nativeHeadings = slash.locator('.menu-group h6');
      await expect(nativeHeadings.first()).toHaveCSS('font-size', '12px');
      await expect(nativeHeadings.first()).toHaveCSS('font-weight', '500');
      await expect(nativeHeadings.first()).toHaveCSS('padding', '4px 8px');
      const nativeRow = slash.locator('.menu-group li').first();
      await expect(nativeRow).toHaveCSS('padding', '4px 8px');
      await expect(nativeRow.getByText('Text', { exact: true })).toHaveCSS(
        'font-size',
        '13px',
      );
      await expect(nativeRow.getByText('Text', { exact: true })).toHaveCSS(
        'font-weight',
        '400',
      );
      const secondGroup = slash.locator('.menu-group').nth(1);
      await expect(secondGroup).toHaveCSS('margin-top', '8px');
      expect(
        await secondGroup.evaluate(
          (el) => getComputedStyle(el, '::before').display,
        ),
      ).toBe('none');
      await slash.screenshot({
        path: test.info().outputPath('native-grouped-menu.png'),
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      expect(errors).toEqual([]);
    });
  }
}
