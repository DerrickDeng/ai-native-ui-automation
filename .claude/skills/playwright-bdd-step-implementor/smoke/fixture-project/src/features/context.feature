Feature: Scenario-scoped context

  Scenario: Remember a value and use it later
    Given I open the fixture app
    When I remember the page title
    Then the page title should equal the remembered title

  Scenario: Context does not leak between scenarios
    Given I open the fixture app
    Then no title should be remembered
