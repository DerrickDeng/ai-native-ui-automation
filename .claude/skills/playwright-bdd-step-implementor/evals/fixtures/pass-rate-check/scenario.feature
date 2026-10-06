@skill-eval @QAD-102
Feature: Skill eval — pass rate

  Scenario: Show a pass rate that matches the result counts
    Given I am signed in to the QA dashboard
    Then the pass rate should match the result counts
