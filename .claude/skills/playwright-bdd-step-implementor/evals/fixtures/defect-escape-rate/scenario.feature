@skill-eval
Feature: Skill eval — defect escape rate

  Scenario: Show the defect escape rate
    Given I am signed in to the QA dashboard
    When I open the Defects section
    Then the defect escape rate should be shown
