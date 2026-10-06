@skill-eval
Feature: Skill eval — pass rate by project

  Scenario: List the projects in the pass rate by project table
    Given I am signed in to the QA dashboard
    Then the pass rate by project table should list at least one project
