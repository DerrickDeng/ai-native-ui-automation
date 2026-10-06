Feature: Tab switching outline

  Scenario Outline: Switch to a tab
    Given I open the fixture app
    When I switch to the "<tab>" tab
    Then the "<tab>" tab should be active

    Examples:
      | tab   |
      | Alpha |
      | Beta  |
      | Gamma |
