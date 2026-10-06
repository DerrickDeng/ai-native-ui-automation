Feature: Repeated step text

  Scenario: Switch through all tabs in one scenario
    Given I open the fixture app
    When I switch to the "Alpha" tab
    When I switch to the "Beta" tab
    When I switch to the "Gamma" tab
    Then the "Gamma" tab should be active
