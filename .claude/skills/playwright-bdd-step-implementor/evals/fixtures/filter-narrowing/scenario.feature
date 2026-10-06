@skill-eval
Feature: Skill eval — filter narrowing

  Scenario: Narrow the dashboard to one region
    Given I am signed in to the QA dashboard
    When I narrow the dashboard to region "hk" over the last 7 days
    Then the pass rate by project table should show only "hk-" projects for the last 7 days
