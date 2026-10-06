@skill-eval
Feature: Skill eval — run filters

  Scenario Outline: Filter recent runs by <filter>
    Given I am signed in to the QA dashboard
    When I filter the dashboard by <filter> "<value>"
    Then every recent run should match <filter> "<value>"

    Examples:
      | filter      | value |
      | Region      | sg    |
      | Environment | uat   |
