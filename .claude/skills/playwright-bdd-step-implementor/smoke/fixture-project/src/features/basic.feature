Feature: Fixture app basics

  Scenario: Reveal the secret content
    Given I open the fixture app
    When I click the reveal button
    Then the secret text should be "revealed-content"
