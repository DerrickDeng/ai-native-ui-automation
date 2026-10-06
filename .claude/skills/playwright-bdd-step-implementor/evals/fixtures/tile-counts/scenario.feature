@skill-eval
Feature: Skill eval — result tiles

  Scenario: Show the failed test count
    Given I am signed in to the QA dashboard
    Then the Failed tile should show a count

  Scenario: Show the flaky test count
    Given I am signed in to the QA dashboard
    Then the Flaky tile should show a count
