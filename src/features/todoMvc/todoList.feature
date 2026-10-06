Feature: Todo list

  Background:
    Given the user opens the todo app

  Scenario: Add a todo item
    When the user adds the todo "groceries"
    Then the todo list shows "groceries"
    And the remaining counter shows "oneItemLeft"

  @hk-sit @sg-sit
  Scenario Outline: Filter the todo list by status
    When the user adds the todo "groceries"
    And the user adds the todo "releaseReport"
    And the user completes the todo "groceries"
    And the user shows the "<filter>" todos
    Then the todo list shows "<visibleTodo>"

    Examples:
      | filter    | visibleTodo   |
      | Active    | releaseReport |
      | Completed | groceries     |

  Scenario: Clear completed todo items
    When the user adds the todo "groceries"
    And the user completes the todo "groceries"
    And the user clears the completed todos
    Then the todo list is empty
