Feature: Combo selection

  @env @hk-sit @sg-sit
  Scenario: SIT combo greeting
    Then the configured greeting should be "Hello SIT"

  @env @hk-uat @sg-uat
  Scenario: UAT combo greeting
    Then the configured greeting should be "Hello UAT"

  @env @hk-sit @hk-uat
  Scenario: HK-only combo marker
    Then the configured region should be "hk"

  @env @sg-sit @sg-uat
  Scenario: SG-only combo marker
    Then the configured region should be "sg"

  @env @wip
  Scenario: Pending automation is excluded
    When an intentionally undefined pending step runs
