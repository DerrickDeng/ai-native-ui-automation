@skill-eval
Feature: Skill eval — run report

  Scenario: Open the latest run's report
    Given I am signed in to the QA dashboard
    When I remember the build of the latest run
    And I open the latest run's report
    Then the report should show the remembered build
