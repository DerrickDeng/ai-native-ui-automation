@skill-eval
Feature: Skill eval — section tour

  Scenario: Tour the execution and defect sections
    Given I am signed in to the QA dashboard
    When I set the date range to the last 30 days
    Then the pass rate trend chart should be shown
    When I open the Defects section
    Then the defect escape rate should be shown
