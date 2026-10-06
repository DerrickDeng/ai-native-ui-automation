import { Given, When, Then } from '../fixtures/bddTest';

Given('I open the fixture app', async function ({ fixtureAppPage }) {
  await fixtureAppPage.open();
});

When('I click the reveal button', async function ({ fixtureAppPage }) {
  await fixtureAppPage.clickReveal();
});

Then('the secret text should be {string}', async function ({ fixtureAppPage }, expected: string) {
  await fixtureAppPage.assertSecretText(expected);
});

When('I switch to the {string} tab', async function ({ fixtureAppPage }, tabName: string) {
  await fixtureAppPage.switchTab(tabName);
});

Then('the {string} tab should be active', async function ({ fixtureAppPage }, tabName: string) {
  await fixtureAppPage.assertActiveTab(tabName);
});

When('I remember the page title', async function ({ ctx, fixtureAppPage }) {
  ctx.rememberedTitle = await fixtureAppPage.pageTitle();
});

Then('the page title should equal the remembered title', async function ({ ctx, fixtureAppPage }) {
  const remembered = ctx.rememberedTitle;
  if (typeof remembered !== 'string') {
    throw new Error('No title was remembered by a previous step');
  }
  await fixtureAppPage.assertTitleEquals(remembered);
});

Then('no title should be remembered', async function ({ ctx }) {
  if (ctx.rememberedTitle !== undefined) {
    throw new Error('ctx leaked between scenarios: rememberedTitle is already set');
  }
});

Given('the journal fixture is active', async function ({ journal }) {
  void journal;
});

Then('the configured greeting should be {string}', async function ({ profile }, expected: string) {
  if (profile.greeting !== expected) {
    throw new Error(`greeting is "${profile.greeting}", expected "${expected}"`);
  }
});

Then('the configured region should be {string}', async function ({ profile }, expected: string) {
  if (profile.region !== expected) {
    throw new Error(`region is "${profile.region}", expected "${expected}"`);
  }
});
