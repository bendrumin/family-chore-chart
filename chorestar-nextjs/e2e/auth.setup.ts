import { test as setup } from '@playwright/test';

const parentAuthFile = 'e2e/.auth/parent.json';

setup('authenticate as parent', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Set TEST_USER_EMAIL and TEST_USER_PASSWORD for create-routine flow');
  }

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await page.waitForURL('/dashboard', { timeout: 15_000 });

  // Suppress the welcome modal in all parent tests by marking it as already seen
  await page.evaluate(() => localStorage.setItem('chorestar_welcome_v2_seen', 'true'));

  await page.context().storageState({ path: parentAuthFile });
});
