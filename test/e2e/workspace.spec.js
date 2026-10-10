import { expect, test } from '@playwright/test';

async function signInAs(page, name) {
  await page.goto('/');
  await expect(page.locator('#sign-in')).toBeVisible();
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await page.getByRole('link', { name: `Sign in as ${name}` }).click();
  await expect(page.locator('#workspace')).toBeVisible();
}

test('Google identity sessions isolate complete treasury workspaces per visitor', async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const anonymous = await browser.newPage();
  await anonymous.goto(baseURL);
  await expect(anonymous.locator('#workspace')).toBeHidden();
  expect(await anonymous.evaluate(async () => (await fetch('/api/state')).status)).toBe(401);

  const aliceContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  await signInAs(alice, 'Alice');
  await expect(alice.locator('#user-email')).toHaveText('alice@example.test');
  await alice.locator('#refresh-balance').click();
  await expect(alice.locator('#available-value')).toHaveText('$1,000.00');
  await alice.locator('[name="name"]').fill('Alice supplier');
  await alice.locator('[name="amount"]').fill('123.45');
  await alice.locator('[name="beneficiaryId"]').fill('bene_playwright_alice');
  await alice.locator('#obligation-form button[type="submit"], #obligation-form button').click();
  await expect(alice.locator('#obligations-list')).toContainText('Alice supplier');
  await alice.locator('#calculate-plan').click();
  await alice.getByRole('button', { name: 'Approve exact action' }).click();
  await alice.getByRole('button', { name: 'Execute sandbox transfer' }).click();
  await expect(alice.locator('#operations-list')).toContainText('CREATED');

  const bobContext = await browser.newContext();
  const bob = await bobContext.newPage();
  await signInAs(bob, 'Bob');
  await expect(bob.locator('#user-email')).toHaveText('bob@example.test');
  // The configured Airwallex balance is shared; obligations and operations remain private.
  await expect(bob.locator('#available-value')).toHaveText('$1,000.00');
  await expect(bob.locator('#obligation-count')).toHaveText('0');
  await expect(bob.locator('#operations-list')).toContainText('No transfer operations yet.');
  await bob.locator('[name="name"]').fill('Bob invoice');
  await bob.locator('[name="amount"]').fill('25.00');
  await bob.locator('#obligation-form button[type="submit"], #obligation-form button').click();
  await expect(bob.locator('#obligations-list')).toContainText('Bob invoice');
  await expect(bob.locator('#obligations-list')).not.toContainText('Alice supplier');

  await alice.reload();
  await expect(alice.locator('#user-email')).toHaveText('alice@example.test');
  await expect(alice.locator('#obligations-list')).toContainText('Alice supplier');
  await expect(alice.locator('#obligations-list')).not.toContainText('Bob invoice');
  await expect(alice.locator('#operations-list')).toContainText('CREATED');

  await bob.locator('#logout').click();
  await expect(bob.locator('#sign-in')).toBeVisible();
  await aliceContext.close();
  await bobContext.close();
  await anonymous.close();
});
