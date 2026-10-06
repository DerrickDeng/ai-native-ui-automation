Feature: Scenario Outline tag position

  @hk-uat @outline-grep
  Scenario Outline: Outline scoped profile tag
    Given the tag fixture runs for "<case>"

    Examples:
      | case |
      | one  |
