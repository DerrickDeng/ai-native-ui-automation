import { Given, Then, When } from '../../fixtures/bddTest';

Given('the user opens the todo app', async function ({ todoPage }) {
  await todoPage.open();
});

When('the user adds the todo {string}', async function ({ todoPage }, todoCode: string) {
  await todoPage.addTodo(todoCode);
});

When('the user completes the todo {string}', async function ({ todoPage }, todoCode: string) {
  await todoPage.completeTodo(todoCode);
});

Then('the todo list shows {string}', async function ({ todoPage }, todoCode: string) {
  await todoPage.assertTodosShown([todoCode]);
});

Then('the todo list is empty', async function ({ todoPage }) {
  await todoPage.assertTodosShown([]);
});

Then('the remaining counter shows {string}', async function ({ todoPage }, counterCode: string) {
  await todoPage.assertRemainingCount(counterCode);
});
