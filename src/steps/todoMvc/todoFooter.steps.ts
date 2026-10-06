import { When } from '../../fixtures/bddTest';

When('the user shows the {string} todos', async function ({ todoFooter }, filterName: string) {
  await todoFooter.showFilter(filterName);
});

When('the user clears the completed todos', async function ({ todoFooter }) {
  await todoFooter.clearCompleted();
});
