@skill-eval @QAD-103
Feature: Skill eval — failing tests

  Scenario: Keep failing tests out of the flaky ranking
    Given I am signed in to the QA dashboard
    Then no consistently failing test should be in the flaky ranking
