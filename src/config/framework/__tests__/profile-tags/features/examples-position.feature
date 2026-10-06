Feature: Examples tag position

  Scenario Outline: Examples scoped profile tag
    Given the tag fixture runs for "<case>"

    @sg-uat @examples-grep
    Examples:
      | case |
      | one  |
