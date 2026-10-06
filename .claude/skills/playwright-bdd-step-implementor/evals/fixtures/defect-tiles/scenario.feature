@skill-eval
Feature: Skill eval — defect summary

  Scenario: Show the defect reopen rate
    Given I am signed in to the QA dashboard
    When I open the Defects section
    Then the "Defect reopen rate" tile should be visible
