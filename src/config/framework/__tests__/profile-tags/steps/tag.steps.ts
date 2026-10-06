import { createBdd } from 'playwright-bdd';

const { Given } = createBdd();

Given('the tag fixture runs', async function () {});

Given('the tag fixture runs for {string}', async function ({ $tags }, example: string) {
  void $tags;
  void example;
});
